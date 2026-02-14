// Ref-counted body scroll lock so overlapping modals don't conflict.
// Each modal increments on open and decrements on close; overflow is
// only cleared when the count returns to zero.
let lockCount = 0;

export function lockScroll() {
  lockCount++;
  document.body.style.overflow = 'hidden';
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}
