const button = document.getElementById('test-button');
const status = document.getElementById('test-status');
let pressCount = 0;

button.addEventListener('click', () => {
  pressCount += 1;
  status.textContent = pressCount === 1
    ? 'De knop werkt!'
    : `De knop werkt! ${pressCount} keer getikt.`;
});
