document.addEventListener('DOMContentLoaded', () => {
    const activeFolder = document.querySelector('.folder-village.active');
    const solvedFolder = document.querySelector('.folder-syndrome');
    const lockedFolder = document.querySelector('.folder-court');
    const camera = document.querySelector('.camera');
    const spotlight = activeFolder.querySelector('.spotlight');
    const shadow = activeFolder.querySelector('.shadow');
    const cover = activeFolder.querySelector('.folder-cover');
    const blackout = document.querySelector('.global-blackout');
    const handoffMsg = document.getElementById('handoff-message');
    const retryBtn = document.getElementById('retry-btn');
    const table = document.querySelector('.table');

    let isAnimating = false;

    // Small physical reaction for non-active folders
    const bumpFolder = (el) => {
        if (isAnimating) return;
        const baseTrans = el.classList.contains('folder-syndrome') 
            ? 'translate(-50%, -50%) translateX(400px) rotateZ(5deg)' 
            : 'translate(-50%, -50%) translateX(-400px) rotateZ(-8deg)';
        
        el.animate([
            { transform: `${baseTrans} translateZ(0px)` },
            { transform: `${baseTrans} translateZ(15px) rotateX(3deg)` },
            { transform: `${baseTrans} translateZ(0px)` }
        ], { duration: 350, easing: 'ease-out' });
    };

    solvedFolder.addEventListener('click', () => bumpFolder(solvedFolder));
    lockedFolder.addEventListener('click', () => bumpFolder(lockedFolder));

    activeFolder.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            blackout.animate([{opacity: 0}, {opacity: 1}], {duration: 500, fill: 'forwards'});
            setTimeout(completeTransition, 500);
            return;
        }

        runCinematicSequence();
    });

    function runCinematicSequence() {
        const folderBase = 'translate(-50%, -50%) rotateZ(-2deg)';
        const cameraBase = 'translateZ(-300px) rotateX(55deg) translateY(-50px)';
        
        // 1. Contact (0 - 450ms)
        spotlight.animate([
            { opacity: 0.5 },
            { opacity: 1 }
        ], { duration: 450, fill: 'forwards', easing: 'ease-out' });

        // 2. Lift (450ms - 1250ms) -> Duration 800ms
        activeFolder.animate([
            { transform: `${folderBase} translateZ(0px)` },
            { transform: `${folderBase} translateZ(100px)` }
        ], { delay: 450, duration: 800, fill: 'forwards', easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });

        shadow.animate([
            { transform: 'translateZ(-2px)', filter: 'blur(15px)', opacity: 0.9 },
            { transform: 'translateZ(-102px)', filter: 'blur(35px)', opacity: 0.3 }
        ], { delay: 450, duration: 800, fill: 'forwards', easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });

        // 3. Center (1250ms - 2250ms) -> Duration 1000ms
        camera.animate([
            { transform: cameraBase },
            { transform: 'translateZ(150px) rotateX(0deg) translateY(0px)' }
        ], { delay: 1250, duration: 1000, fill: 'forwards', easing: 'ease-in-out' });

        table.animate([
            { filter: 'blur(0px) brightness(1)' },
            { filter: 'blur(12px) brightness(0.2)' }
        ], { delay: 1250, duration: 1000, fill: 'forwards', easing: 'ease-in-out' });

        activeFolder.animate([
            { transform: `${folderBase} translateZ(100px)` },
            { transform: `translate(-50%, -50%) rotateZ(0deg) translateZ(100px)` }
        ], { delay: 1250, duration: 1000, fill: 'forwards', easing: 'ease-in-out' });

        // 4. Open (2250ms - 3550ms) -> Duration 1300ms
        cover.animate([
            { transform: 'translateZ(4px) rotateY(0deg)' },
            { transform: 'translateZ(4px) rotateY(165deg)' }
        ], { delay: 2250, duration: 1300, fill: 'forwards', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });

        // 5. Dive (3550ms - 4850ms) -> Duration 1300ms
        camera.animate([
            { transform: 'translateZ(150px) rotateX(0deg) translateY(0px)' },
            { transform: 'translateZ(850px) rotateX(0deg) translateY(0px)' }
        ], { delay: 3550, duration: 1300, fill: 'forwards', easing: 'ease-in' });

        // 6. Handoff (4850ms - 5300ms) -> Duration 450ms
        blackout.animate([
            { opacity: 0 },
            { opacity: 1 }
        ], { delay: 4850, duration: 450, fill: 'forwards', easing: 'linear' });

        setTimeout(completeTransition, 5300);
    }

    function completeTransition() {
        document.dispatchEvent(new CustomEvent('archive:transition-complete'));
        handoffMsg.classList.remove('hidden');
    }

    retryBtn.addEventListener('click', () => {
        document.getAnimations().forEach(anim => anim.cancel());
        handoffMsg.classList.add('hidden');
        isAnimating = false;
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isAnimating) {
            document.getAnimations().forEach(anim => anim.cancel());
            handoffMsg.classList.add('hidden');
            isAnimating = false;
        }
    });
});
