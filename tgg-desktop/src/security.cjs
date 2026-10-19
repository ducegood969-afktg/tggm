const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw Error('Use a password of 12–256 characters.');
  const salt = randomBytes(16).toString('hex');
  return {salt, hash:scryptSync(password, salt, 64).toString('hex')};
}
function verifyPassword(password, record) {
  if (typeof password !== 'string' || password.length > 256 || !record) return false;
  const actual = scryptSync(password, record.salt, 64);
  const expected = Buffer.from(record.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function validateSettings(input) {
  if(input?.provider==='ollama'){
    if(typeof input.model!=='string'||! /^(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,99}$/.test(input.model))throw Error('Invalid local model name.');
    return {provider:'ollama',model:input.model};
  }
  if(input?.provider&&input.provider!=='openai')throw Error('Unknown AI provider.');
  if (!input || typeof input.apiKey !== 'string' || !input.apiKey.trim() || input.apiKey.length > 1024) throw Error('An API key is required.');
  if (typeof input.model !== 'string' || !/^[a-zA-Z0-9._:-]{1,100}$/.test(input.model)) throw Error('Invalid model name.');
  return {apiKey:input.apiKey.trim(), model:input.model};
}
module.exports = {hashPassword, verifyPassword, validateSettings};
