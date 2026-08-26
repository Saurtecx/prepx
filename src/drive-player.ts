export {};

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

  // This endpoint is the most useful direct candidate for publicly accessible
  // Drive files. It is different from the normal /uc endpoint and avoids the
  // Drive preview page when Google permits direct media delivery.
  const candidates = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`
  ];

  let candidate = 0;
  let restored = false;
  let timer = 0;

  const restore = () => {
    if (restored) return;
    restored = true;
    window.clearTimeout(timer);
    if (video.parentNode) video.replaceWith(frame);
  };

  const tryNext = () => {
    window.clearTimeout(timer);
    candidate += 1;
    if (candidate >= candidates.length) {
      restore();
      return;
    }
    video.src = candidates[candidate];
    video.load();
    timer = window.setTimeout(() => {
      if (video.readyState < 1) tryNext();
    }, 6000);
  };

  video.addEventListener('error', tryNext);
  video.addEventListener('loadedmetadata', () => window.clearTimeout(timer), { once: true });
  video.src = candidates[0];
  timer = window.setTimeout(() => {
    if (video.readyState < 1) tryNext();
  }, 6000);

  frame.replaceWith(video);
}

function scan(root: ParentNode = document) {
  root.querySelectorAll<HTMLIFrameElement>('.learn .video iframe[src*="drive.google.com"]').forEach(upgrade);
}

scan();
const observer = new MutationObserver(() => scan());
observer.observe(document.documentElement, { childList: true, subtree: true });
