// Boot: runs last, once every other script has defined its functions.
'use strict';
startThemes();
resize();
buildBg();
renderMenu();
poll(); setInterval(poll,1000);
setInterval(renderCard,500);
requestAnimationFrame(frame);
