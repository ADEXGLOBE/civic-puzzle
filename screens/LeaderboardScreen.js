import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, spacing } from '../theme';

const BASE_URL = 'http://YOUR_IP:5000';

export default function LeaderboardScreen() {
  const [rows, setRows] = useState([]);
  useEffect(()=>{ fetch(`${BASE_URL}/api/leaderboard?city=Ballarat`).then(r=>r.json()).then(setRows).catch(()=>setRows([])); },[]);
  return (
    <View style={s.container}>
      <Text style={s.title}>Ballarat – Today’s Top 50</Text>
      <FlatList
        data={rows}
        keyExtractor={(_,i)=>String(i)}
        renderItem={({item,index})=>(
          <View style={s.row}>
            <Text style={s.rank}>{index+1}</Text>
            <Text style={s.name}>{item.u}</Text>
            <Text style={s.time}>{item.t}s</Text>
            <Text style={s.attempts}>{item.a} tries</Text>
          </View>
        )}
      />
    </View>
  );
}
const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:colors.bg, padding:spacing.lg },
  title:{ color:colors.charcoal, fontSize:18, fontWeight:'800', marginBottom:spacing.md, textAlign:'center' },
  row:{ flexDirection:'row', backgroundColor:'#111827', borderRadius:12, padding:12, marginBottom:8, gap:12, borderWidth:1, borderColor:'#1F2937', alignItems:'center' },
  rank:{ color:'#9CA3AF', width:28, textAlign:'center' },
  name:{ color:colors.charcoal, flex:1, fontWeight:'700' },
  time:{ color:'#D1FAE5', width:60, textAlign:'right' },
  attempts:{ color:'#FDE68A', width:80, textAlign:'right' }
});
