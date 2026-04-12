/**
 * Apple Notes API helper — used by serve.js
 * Reads notes via AppleScript
 */
const { execSync } = require('child_process');

function runAppleScript(script) {
  return execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, { timeout: 10000 }).toString().trim();
}

function getNotesList() {
  try {
    const names = runAppleScript('tell application "Notes" to get name of notes of default account');
    const dates = runAppleScript('tell application "Notes" to get modification date of notes of default account');
    const nameArr = names.split(', ');
    const dateArr = dates.split(', ');
    return nameArr.map((name, i) => ({
      id: i,
      title: name.trim(),
      modified: dateArr[i]?.trim() || '',
    })).slice(0, 100); // Cap at 100
  } catch(e) { return []; }
}

function getNoteContent(index) {
  try {
    const script = `tell application "Notes" to get plaintext of note ${index + 1} of default account`;
    return runAppleScript(script);
  } catch(e) { return ''; }
}

module.exports = { getNotesList, getNoteContent };
