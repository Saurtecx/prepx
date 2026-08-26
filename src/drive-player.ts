export {};

// Try a native HTML5 player for Google Drive videos. If Drive refuses the media
// request, immediately restore the original preview iframe so lessons never go blank.
const style = document.createElement('style');
style.id = 'prepx-drive-responsive-fix';
style.textContent = `
.video{position:relative;overflow:hidden;background:#000}
.prepx-native-player{width:100%;height:100%;display:block;background:#000;object-fit:contain}
@media(max-width:800px){
  .learn .video{width:100%;height:auto!important;aspect-ratio:16/9;min-height:0!important;border-radius:18px;overflow:hidden;background:#000}
  .learn .video iframe,.learn .video .prepx-native-player{position:absolute;inset:0;width:100%!important;height:100%!important;border:0!important}
}
`;
if (!document.getElementById(style.id)) document.head.appendChild(style);

function driveIdFromPreview(src: string) {
  const match = src.match(/\/file\/d\/([^/?]+)/) || src.match(/[?&]id=([^&]+)/);
  return match?.[1] || null;
}

function upgrade(frame: HTMLIFrameElement) {
  if (frame.dataset.prepxUpgraded) return;
  const id = driveIdFromPreview(frame.src);
  if (!id) return;
  frame.dataset.prepxUpgraded = '1';

  const video = document.createElement('video');
  video.className = 'prepx-native-player';
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('controlsList', 'nodownload');
  // Google Drive's content endpoint is used only as an enhancement. The iframe
  // remains the safe fallback because Drive can reject direct media requests.
  video.src = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    if (video.parentNode) video.replaceWith(frame);
  };

  video.addEventListener('error', restore, { once: true });
  // If metadata never arrives, do not leave the user staring at a blank player.
  const timeout = window.setTimeout(() => {
    if (video.readyState < 1) restore();
  }, 7000);
  video.addEventListener('loadedmetadata', () => window.clearTimeout(timeout), { once: true });

  frame.replaceWith(video);
}

function scan(root: ParentNode = document) {
  root.querySelectorAll<HTMLIFrameElement>('.learn .video iframe[src*="drive.google.com"]').forEach(upgrade);
}

scan();
const observer = new MutationObserver(() => scan());
observer.observe(document.documentElement, { childList: true, subtree: true });
