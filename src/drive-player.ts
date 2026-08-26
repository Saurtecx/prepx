export {};

// Google Drive does not expose a reliable CORS-safe media URL for <video>.
// Keep Drive's working preview for now and only normalize the responsive shell.
const css = `
.video{position:relative;overflow:hidden;background:#000}
.video iframe{display:block;width:100%!important;height:100%!important;border:0!important}
@media(max-width:800px){
  .learn .video{width:100%;height:auto!important;aspect-ratio:16/9;min-height:0!important;border-radius:18px;overflow:hidden;background:#000}
  .learn .video iframe{position:absolute;inset:0;width:100%!important;height:100%!important}
}
`;

const style=document.createElement('style');
style.id='prepx-drive-responsive-fix';
if(!document.getElementById(style.id)){
  style.textContent=css;
  document.head.appendChild(style);
}

// Do not replace the iframe with a direct download URL. Google Drive commonly
// rejects that URL for browser video playback, which results in a blank player.
