// screens/CrosswordScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, TextInput, Alert } from 'react-native';

const CELL = 28; // tile size

export default function CrosswordScreen({ route }) {
  const { crosswordId, baseUrl } = route.params || {};
  const [data, setData] = useState(null);
  const [grid, setGrid] = useState([]); // 2D char array or '#'
  const [sel, setSel] = useState({ r:0, c:0, dir:'across' }); // selection
  const [clue, setClue] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/crosswords/${crosswordId}`);
        const json = await res.json();
        setData(json);
      } catch (e) { Alert.alert('Error', 'Failed to load crossword.'); }
    })();
  }, [crosswordId]);

  // build grid
  useEffect(() => {
    if (!data) return;
    const { rows, cols } = data.size;
    const G = Array.from({ length: rows }, () => Array(cols).fill(''));
    data.blocks.forEach(([r,c]) => { G[r][c] = '#'; });
    setGrid(G);
    setSel({ r:0, c:0, dir:'across' });
  }, [data]);

  const clues = useMemo(() => {
    if (!data) return { across:[], down:[] };
    return { across: data.across || [], down: data.down || [] };
  }, [data]);

  const inBounds = (r,c) => r>=0 && c>=0 && r<grid.length && c<grid[0].length && grid[r][c] !== '#';

  const move = (dr,dc) => {
    let { r,c } = sel;
    do { r += dr; c += dc; } while (inBounds(r,c) && grid[r][c] === '#');
    if (inBounds(r,c)) setSel(s => ({ ...s, r, c }));
  };

  const setLetter = (ch) => {
    const { r,c,dir } = sel;
    if (!inBounds(r,c)) return;
    const G = grid.map(row => row.slice());
    G[r][c] = ch.toUpperCase();
    setGrid(G);
    // advance
    if (dir === 'across') move(0,1); else move(1,0);
  };

  const backspace = () => {
    const { r,c,dir } = sel;
    const G = grid.map(row => row.slice());
    if (!inBounds(r,c)) return;
    G[r][c] = '';
    setGrid(G);
  };

  const tile = (r,c) => {
    const isSel = sel.r===r && sel.c===c;
    const val = grid[r][c];
    const blocked = val === '#';
    return (
      <TouchableOpacity
        key={`${r}-${c}`}
        style={[styles.cell, blocked && styles.block, isSel && styles.sel]}
        onPress={() => setSel(s => ({ ...s, r, c }))}
        activeOpacity={0.8}
      >
        <Text style={styles.cellTxt}>{blocked ? '' : (val || '')}</Text>
      </TouchableOpacity>
    );
  };

  if (!data || grid.length === 0) {
    return <View style={styles.center}><Text>Loading…</Text></View>;
  }

  const rows = grid.length, cols = grid[0].length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{data.title}</Text>

      {/* Grid */}
      <View style={[styles.grid, { width: cols*CELL, height: rows*CELL }]}>
        {grid.map((row, r) => (
          <View key={r} style={{ flexDirection:'row' }}>
            {row.map((_, c) => tile(r,c))}
          </View>
        ))}
      </View>

      {/* Clue toggles */}
      <View style={styles.dirRow}>
        <TouchableOpacity
          style={[styles.dirBtn, sel.dir==='across' && styles.dirActive]}
          onPress={() => setSel(s => ({ ...s, dir:'across' }))}
        ><Text style={[styles.dirTxt, sel.dir==='across' && styles.dirTxtActive]}>Across</Text></TouchableOpacity>
        <TouchableOpacity
          style={[styles.dirBtn, sel.dir==='down' && styles.dirActive]}
          onPress={() => setSel(s => ({ ...s, dir:'down' }))}
        ><Text style={[styles.dirTxt, sel.dir==='down' && styles.dirTxtActive]}>Down</Text></TouchableOpacity>
      </View>

      {/* Clues list */}
      <FlatList
        style={{ alignSelf:'stretch', marginTop:8 }}
        data={sel.dir==='across' ? clues.across : clues.down}
        keyExtractor={(it) => String(it.num)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.clue} onPress={() => setClue(item)}>
            <Text style={styles.clueNum}>{item.num}.</Text>
            <Text style={styles.clueText}>{item.clue}</Text>
          </TouchableOpacity>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
      />

      {/* Input strip */}
      <View style={styles.inputRow}>
        {'QWERTYUIOP'.split('').map(ch =>
          <TouchableOpacity key={ch} style={styles.key} onPress={() => setLetter(ch)}>
            <Text style={styles.keyTxt}>{ch}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.key, styles.keyBack]} onPress={backspace}>
          <Text style={styles.keyTxt}>⌫</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#fff', alignItems:'center', padding:12 },
  center:{ flex:1, alignItems:'center', justifyContent:'center' },
  title:{ fontSize:18, fontWeight:'800', marginBottom:8 },
  grid:{ borderWidth:1, borderColor:'#111', backgroundColor:'#fff' },
  cell:{ width:CELL, height:CELL, borderWidth:1, borderColor:'#111', alignItems:'center', justifyContent:'center' },
  block:{ backgroundColor:'#111' },
  sel:{ borderColor:'#22C55E', borderWidth:2 },
  cellTxt:{ fontSize:16, fontWeight:'700' },
  dirRow:{ flexDirection:'row', gap:8, marginTop:8 },
  dirBtn:{ paddingVertical:6, paddingHorizontal:12, borderRadius:10, backgroundColor:'#F3F4F6' },
  dirActive:{ backgroundColor:'#111827' },
  dirTxt:{ fontWeight:'700', color:'#111827' },
  dirTxtActive:{ color:'#fff' },
  clue:{ flexDirection:'row', alignItems:'center', paddingVertical:8, paddingHorizontal:12, backgroundColor:'#F9FAFB', borderRadius:10, marginRight:8, borderWidth:1, borderColor:'#E5E7EB' },
  clueNum:{ fontWeight:'800', marginRight:6 },
  clueText:{ color:'#111827' },
  inputRow:{ flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:12, justifyContent:'center' },
  key:{ backgroundColor:'#E5E7EB', paddingVertical:10, paddingHorizontal:12, borderRadius:8 },
  keyBack:{ backgroundColor:'#FCA5A5' },
  keyTxt:{ fontWeight:'800' }
});
