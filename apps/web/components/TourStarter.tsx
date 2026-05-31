'use client';

import { useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { getTour } from '@/lib/tours';

export function TourStarter() {
  const params   = useSearchParams();
  const pathname = usePathname();
  const tourId   = params.get('tour');

  useEffect(() => {
    if (!tourId) return;
    const tour = getTour(tourId);
    if (!tour) return;

    const timer = setTimeout(async () => {
      // Clean up URL after timer fires — too late to cancel by this point
      const url = new URL(window.location.href);
      url.searchParams.delete('tour');
      window.history.replaceState({}, '', url.toString());

      const introJs = (await import('intro.js')).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = introJs() as any;

      instance.setOptions({
        steps: tour.steps.map(s => ({
          element:  s.element ?? undefined,
          title:    s.title,
          intro:    s.intro,
          position: s.position === 'auto' ? undefined : s.position,
        })),
        showProgress:       true,
        showBullets:        false,
        exitOnOverlayClick: true,
        nextLabel:          'Siguiente →',
        prevLabel:          '← Anterior',
        doneLabel:          'Finalizar',
        disableInteraction: false,
        scrollToElement:    true,
        overlayOpacity:     0.4,
        tooltipClass:       'fundares-intro-tooltip',
        highlightClass:     'fundares-intro-highlight',
      });

      let stepIdx = -1;

      instance.onchange(function(targetElement: Element | null) {
        stepIdx++;
        const stepDef = tour.steps[stepIdx];
        if (!stepDef) return;

        // Wait for intro.js to render the tooltip before touching it
        setTimeout(() => {
          const nextBtn = document.querySelector<HTMLElement>('.introjs-nextbutton');

          if (stepDef.waitForClick && targetElement) {
            // Hide "Next" — user must click the actual element
            if (nextBtn) nextBtn.style.visibility = 'hidden';

            targetElement.addEventListener('click', () => {
              // Wait for drawer/panel animation before advancing
              setTimeout(() => {
                try { instance.nextStep(); } catch { /* tour may have ended */ }
              }, 500);
            }, { once: true });
          } else {
            if (nextBtn) nextBtn.style.visibility = 'visible';
          }
        }, 80);
      });

      instance.start();
    }, 600);

    return () => clearTimeout(timer);
  }, [tourId, pathname]);

  return null;
}
