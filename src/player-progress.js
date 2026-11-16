import { DESTINATIONS } from './destinations.js';
// Historical local milestones only. These never restore or alter a flight.
export const MILESTONES=Object.freeze({
  'earth-orbit':'Reach Earth orbit',
  'lunar-touchdown':'Complete the Moon expedition',
  'docking-capture':'Capture a docking port',
  'surface-touchdown':'Land a spacecraft',
});
const KEY='kinetic-core.player-milestones.v1';
export function readProgress(storage){
  try{storage??=globalThis.localStorage;const raw=JSON.parse(storage.getItem(KEY)||'{}');return Object.fromEntries(Object.keys(MILESTONES).filter(id=>raw[id]===true).map(id=>[id,true]));}catch{return{};}
}
export function saveMilestone(id,storage){
  if(DESTINATIONS.some(body=>id==='surface-'+body.id))id='surface-touchdown';
  if(!Object.hasOwn(MILESTONES,id))return false;
  try{storage??=globalThis.localStorage;const raw=readProgress(storage);raw[id]=true;storage.setItem(KEY,JSON.stringify(raw));return true;}catch{return false;}
}
