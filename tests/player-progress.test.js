import test from 'node:test';
import assert from 'node:assert/strict';
import {readProgress,saveMilestone} from '../src/player-progress.js';
const storage=()=>{let value=null;return {getItem:()=>value,setItem:(_key,next)=>{value=next;}};};
test('historical progress keeps only explicitly confirmed known milestones',()=>{const s=storage();s.setItem('',JSON.stringify({'earth-orbit':true,'lunar-touchdown':'true','docking-capture':0,'fake-win':true}));assert.deepEqual(readProgress(s),{'earth-orbit':true});assert.equal(saveMilestone('fake-win',s),false);assert.equal(saveMilestone('docking-capture',s),true);assert.deepEqual(readProgress(s),{'earth-orbit':true,'docking-capture':true});});
test('denied or malformed progress storage cannot prevent play',()=>{const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};assert.deepEqual(readProgress(denied),{});assert.equal(saveMilestone('earth-orbit',denied),false);const s=storage();s.setItem('','{broken');assert.deepEqual(readProgress(s),{});assert.equal(saveMilestone('lunar-touchdown',s),true);});

test('surface practice counts confirmed known worlds without claiming a Moon expedition',()=>{const s=storage();assert.equal(saveMilestone('surface-phobos',s),true);assert.deepEqual(readProgress(s),{'surface-touchdown':true});assert.equal(saveMilestone('surface-jupiter',s),false);});
