// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos) {
    for (let ix = 0; ix < fgImg.width; ix++) {
        for (let iy = 0; iy < fgImg.height; iy++) {
            let offset = (iy * fgImg.width + ix) * 4;
            let xbg = ix + fgPos.x;
            let ybg = iy + fgPos.y;
            let offset_bg = (ybg * bgImg.width + xbg) * 4;

            if (xbg >= 0 && xbg < bgImg.width && ybg >= 0 && ybg < bgImg.height) {
                let fgAlpha = fgImg.data[offset + 3] * fgOpac /255; 
                let Afinal = fgAlpha + bgImg.data[offset_bg + 3] * (1 - fgAlpha);
                let Rfinal = (fgImg.data[offset] * fgAlpha + bgImg.data[offset_bg] * (1 - fgAlpha));
                let Gfinal = (fgImg.data[offset + 1] * fgAlpha + bgImg.data[offset_bg + 1] * (1 - fgAlpha));
                let Bfinal = (fgImg.data[offset + 2] * fgAlpha + bgImg.data[offset_bg + 2] * (1 - fgAlpha));

                bgImg.data[offset_bg] = Rfinal;
                bgImg.data[offset_bg + 1] = Gfinal;
                bgImg.data[offset_bg + 2] = Bfinal;
                bgImg.data[offset_bg + 3] = Afinal*255;
            }
        }
    }
}






