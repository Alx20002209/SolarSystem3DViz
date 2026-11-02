// CSS viewport dimensions stay independent of the GPU drawing-buffer resolution.
export function renderResolution(width,height,dpr=1,coarse=false){
 width=Math.max(1,Math.round(width));height=Math.max(1,Math.round(height));
 const phone=Math.min(width,height)<=600&&(coarse||Math.max(width,height)<=1000);
 const cap=phone?1.25:1.5;
 const budget=phone?1000000:8000000;
 const pixelRatio=Math.min(Math.max(.5,dpr),cap,Math.sqrt(budget/(width*height)));
 return {width,height,pixelRatio,phone};
}
