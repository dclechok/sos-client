const MAX=100,BASE=100,GROW=1.12;
export const xpTable=Array.from({length:MAX},(_,i)=>i?Math.round(BASE*((GROW**i-1)/(GROW-1))):0);
export const levelFormat=exp=>xpTable.findLastIndex(x=>exp>=x)||1;

/*
| Level | Total XP needed   |
| ----- | ----------------- |
| 2     | 100 XP            |
| 10    | ~2,100 XP         |
| 20    | ~6,500 XP         |
| 30    | ~20,000 XP        |
| 40    | ~63,000 XP        |
| 50    | ~198,000 XP       |
| 60    | ~620,000 XP       |
| 70    | ~1,940,000 XP     |
| 80    | ~3,100,000 XP     |
| 90    | ~3,250,000 XP     |
| 100   | **~3,300,000 XP** |
*/