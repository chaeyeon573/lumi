import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import type { ProfilePrompt } from '@core/types';
import { Screen, Button } from '@/ui';
import { useViewer } from '@/viewer';
import { s } from '@/lumi/Screens';
const choices=[['q_always',"I'm always down for…"],['q_weekend','My ideal weekend…'],['q_want_person',"I'm looking for people to…"],['q_one_line','A fun fact about me…']];
export default function PromptEditor(){const me=useViewer().me;const run=useAppStore(st=>st.run);const [prompts,setPrompts]=useState<ProfilePrompt[]>(me.prompts);const [busy,setBusy]=useState(false);return <Screen title="Get to know me"><Text style={[s.sub,{marginVertical:16}]}>Optional. A few short answers are all you need. Your profile shows up to three.</Text>{choices.map(([id,label])=><View key={id} style={s.card}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={prompts.find(p=>p.questionId===id)?.answer||''} onChangeText={answer=>setPrompts(xs=>[{questionId:id,answer},...xs.filter(p=>p.questionId!==id)])} placeholder="Your answer" multiline maxLength={280} style={[s.input,{minHeight:76,textAlignVertical:'top',padding:12}]}/></View>)}<Button loading={busy} onPress={async()=>{setBusy(true);try{await run(()=>api.users.update(me.id,{prompts:prompts.filter(p=>p.answer.trim()).slice(0,6)}),'Answers saved');}catch{/* toast */}finally{setBusy(false);}}}>Save answers</Button></Screen>;}
