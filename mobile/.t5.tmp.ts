import { symbolCurrencies, nextHighImpact, sameMinuteHighImpact, newsBannerText } from './src/chart/newsRisk';
const now = Date.parse('2026-09-25T12:00:00Z');
const ts = now/1000 + 1800;
const ev = [
 {id:'a',title:'Non-Farm Employment Change',currency:'USD',impact:'high',ts},
 {id:'b',title:'ECB President Lagarde Speaks',currency:'EUR',impact:'high',ts},
 {id:'c',title:'OPEC Meeting',currency:'ALL',impact:'high',ts: ts+600},
];
const cur = symbolCurrencies('EURUSD');
const h = nextHighImpact(ev, cur, now)!;
console.log(h.event.id, newsBannerText({head:'High',currency:h.event.currency,when:'in 30m',title:h.event.title,more:sameMinuteHighImpact(ev,cur,h.event)}));
console.log(nextHighImpact([ev[2]], symbolCurrencies('USOIL'), now));
