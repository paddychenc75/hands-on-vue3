---
layout: page
title: 首页
sidebar: false
aside: false
# 短片模式：在首次绘制前就给 <html> 加上 film-dyn（避免先闪一下静态长文）；动画脚本 6 秒内没起来（.film 上没出现 .ready）就自动去掉，页面退回静态长文
head:
  - - script
    - {}
    - 'try{var h=document.documentElement;h.classList.add("film-dyn");setTimeout(function(){var s=document.querySelector(".film");if(!s||!s.classList.contains("ready"))h.classList.remove("film-dyn")},6000)}catch(e){}'
---

<HomeFilm />
