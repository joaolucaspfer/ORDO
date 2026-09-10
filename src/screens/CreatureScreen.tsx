import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PressableScale as Pressable } from '../components/PressableScale';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, type Theme } from '../theme';
import DachshundView from '../components/DachshundView';
import { levelForXp, moodForEnergy, MAX_ENERGY } from '../creature/stages';
import {
  getCreature,
  refreshCreature,
  renameCreature,
  setCoat,
  buyAccessory,
  getOwnedItems,
  getEquipped,
  equipAccessory,
  unequipAccessory,
  ENERGY_DECAY_PER_DAY,
} from '../db/creature';
import { getStats, type Stats } from '../db/streak';
import { ACCESSORIES, COATS, type Accessory } from '../lib/wardrobe';
import { emitCreatureName } from '../lib/creatureEvents';

interface CreatureData {
  xp: number;
  energy: number;
  name: string;
  coins: number;
  coat: string;
  owned: Set<string>;
  equipped: Record<string, Accessory>;
  stats: Stats;
}

export default function CreatureScreen() {
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const [data, setData] = useState<CreatureData | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  const reload = useCallback(async () => {
    const [creature, owned, equipped, stats] = await Promise.all([
      refreshCreature(db, await getCreature(db)),
      getOwnedItems(db),
      getEquipped(db),
      getStats(db),
    ]);
    setData({
      xp: creature.xp,
      energy: creature.energy,
      name: creature.name,
      coins: creature.coins,
      coat: creature.coat,
      owned,
      equipped,
      stats,
    });
    setNameDraft(creature.name);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(data?.name ?? '');
      return;
    }
    await renameCreature(db, trimmed);
    emitCreatureName(trimmed);
    setData((d) => (d ? { ...d, name: trimmed } : d));
    Alert.alert('Feito!', 'Nome atualizado.');
  };

  const pickCoat = async (coatId: string) => {
    await setCoat(db, coatId);
    await reload();
  };

  const onBuy = async (item: Accessory) => {
    if (!data) return;
    const result = await buyAccessory(db, item.id);
    if (!result.ok && result.reason === 'not_enough_coins') {
      Alert.alert(
        'Faltam moedas 🪙',
        `O «${item.label}» custa ${item.price} moedas. Cumpre a tua rotina para ganhares mais.`
      );
    }
    await reload();
  };

  const onEquip = async (item: Accessory) => {
    await equipAccessory(db, item.slot, item.id);
    await reload();
  };

  const onUnequip = async (slot: Accessory['slot']) => {
    await unequipAccessory(db, slot);
    await reload();
  };

  if (!data) {
    return <View style={styles.container} />;
  }

  const progress = levelForXp(data.xp);
  const mood = moodForEnergy(data.energy);
  const energyPct = (data.energy / MAX_ENERGY) * 100;
  const coat = COATS.find((c) => c.id === data.coat) ?? COATS[0];
  const energyColor =
    data.energy >= 70 ? theme.primary : data.energy >= 30 ? theme.warn : theme.danger;

  const moodText =
    mood === 'happy'
      ? 'Está radiante contigo hoje! Continua assim.'
      : mood === 'neutral'
      ? 'Está a precisar que cumpras a tua rotina.'
      : 'Está a ficar fraquinho... Há quanto não o cuidas?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.creatureCard}>
        <DachshundView coatColor={coat.color} energy={data.energy} equipped={data.equipped} />
        <Text style={styles.creatureName}>{data.name}</Text>
        <Text style={styles.moodText}>{moodText}</Text>
        <View style={styles.coinChip}>
          <Text style={styles.coinText}>🪙 {data.coins} moedas</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.stats.streak}</Text>
          <Text style={styles.statLabel}>dias seguidos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.stats.perfectDays}</Text>
          <Text style={styles.statLabel}>dias perfeitos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.stats.totalDone}</Text>
          <Text style={styles.statLabel}>tarefas feitas</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.meterHeader}>
          <Text style={styles.cardTitle}>Energia</Text>
          <Text style={styles.meterValue}>{data.energy}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${energyPct}%`, backgroundColor: energyColor }]} />
        </View>
        <View style={styles.meterHeader}>
          <Text style={styles.cardTitle}>Nível {progress.level}</Text>
          <Text style={styles.meterValue}>{data.xp} XP</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.round(progress.progressPct * 100)}%`, backgroundColor: theme.primary },
            ]}
          />
        </View>
        {progress.next != null ? (
          <Text style={styles.hint}>
            {Math.round(progress.progressPct * 100)}% do caminho até ao nível{' '}
            {progress.level + 1} · mais {progress.next - data.xp} XP
          </Text>
        ) : (
          <Text style={styles.hint}>Já atingiste o nível máximo. Parabéns!</Text>
        )}
        <Text style={styles.hint}>
          Perde {ENERGY_DECAY_PER_DAY}% de energia em cada dia sem check-ins. Cada tarefa dá{' '}
          {'+5 🪙'} e recupera energia.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nome</Text>
        <View style={styles.nameRow}>
          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Nome do cão"
            placeholderTextColor={theme.subtext}
          />
          <Pressable style={styles.saveNameButton} onPress={saveName}>
            <Text style={styles.saveNameText}>Guardar</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cor do pelo</Text>
        <Text style={styles.hint}>Grátis — escolhe a que mais gostas.</Text>
        <View style={styles.coatRow}>
          {COATS.map((c) => {
            const active = c.id === data.coat;
            return (
              <Pressable key={c.id} style={styles.coatWrap} onPress={() => pickCoat(c.id)}>
                <View style={[styles.coatCircle, { backgroundColor: c.color }, active && styles.coatCircleActive]}>
                  {active && <Text style={styles.coatCheck}>✓</Text>}
                </View>
                <Text style={[styles.coatLabel, active && { color: theme.text }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lojinha</Text>
        <Text style={styles.hint}>Ganha moedas ao cumprires a rotina e compra brindes.</Text>
        <View style={styles.shopList}>
          {ACCESSORIES.map((item) => {
            const owned = data.owned.has(item.id);
            const equippedItem = data.equipped[item.slot];
            const isEquipped = equippedItem?.id === item.id;
            const slotTaken = equippedItem != null && equippedItem.id !== item.id;
            return (
              <View key={item.id} style={styles.shopRow}>
                <View style={styles.shopEmojiWrap}>
                  <Text style={styles.shopEmoji}>{item.emoji}</Text>
                </View>
                <View style={styles.shopInfo}>
                  <Text style={styles.shopLabel}>{item.label}</Text>
                  <Text style={styles.shopPrice}>
                    {owned ? 'Já tens' : `${item.price} 🪙`} · {item.slot}
                  </Text>
                </View>
                {!owned ? (
                  <Pressable style={styles.buyButton} onPress={() => onBuy(item)}>
                    <Text style={styles.buyButtonText}>Comprar</Text>
                  </Pressable>
                ) : isEquipped ? (
                  <Pressable style={styles.removeButton} onPress={() => onUnequip(item.slot)}>
                    <Text style={styles.removeButtonText}>Remover</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.equipButton}
                    disabled={slotTaken}
                    onPress={() => onEquip(item)}
                  >
                    <Text
                      style={[
                        styles.equipButtonText,
                        slotTaken && { color: theme.subtext },
                      ]}
                    >
                      {slotTaken ? 'Ocupado' : 'Usar'}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  creatureCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 16,
  },
  creatureName: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800',
  },
  moodText: {
    color: theme.subtext,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  coinChip: {
    marginTop: 12,
    backgroundColor: theme.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  coinText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    color: theme.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: theme.subtext,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  cardTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  meterValue: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.cardAlt,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  hint: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  nameInput: {
    flex: 1,
    backgroundColor: theme.cardAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveNameButton: {
    backgroundColor: theme.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  saveNameText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  coatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
  },
  coatWrap: {
    alignItems: 'center',
    gap: 6,
  },
  coatCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coatCircleActive: {
    borderColor: theme.primary,
  },
  coatCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 3,
  },
  coatLabel: {
    color: theme.subtext,
    fontSize: 11,
  },
  shopList: {
    marginTop: 10,
    gap: 10,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.cardAlt,
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  shopEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopEmoji: {
    fontSize: 20,
  },
  shopInfo: {
    flex: 1,
  },
  shopLabel: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  shopPrice: {
    color: theme.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  buyButtonText: {
    color: theme.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  equipButton: {
    backgroundColor: theme.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  equipButtonText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  removeButton: {
    backgroundColor: theme.dangerSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  removeButtonText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  });