(()=>{const as=[...document.querySelectorAll('.toc a')];if(!as.length)return;const ss=as.map(a=>document.querySelector(a.getAttribute('href')));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const i=ss.indexOf(e.target);as.forEach((a,k)=>a.classList.toggle('on',k===i))}}),{rootMargin:'-20% 0px -70% 0px'});ss.forEach(s=>s&&io.observe(s))})();
