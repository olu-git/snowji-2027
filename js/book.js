/* WeTravel checkout on the page.
   Every link to the WeTravel trip page becomes a WeTravel "Book Now" widget: clicking opens WeTravel's checkout
   as a pop-up over this site (cdn.wetravel.com/widgets/embed_checkout.js). If that script can't load
   (ad blocker, network), the click falls back to the normal WeTravel trip page in a new tab.
   Embed values come from WeTravel → Manage Trip → Promote → Button → Copy HTML. */
(() => {
  'use strict';
  const TRIP = 'https://www.wetravel.com/trips/snowji-2027-soji-3534687816';
  const WETRAVEL = {
    env: 'https://www.wetravel.com',
    version: 'v0.4',
    uid: '1511722',
    uuid: '3534687816',
  };
  const CHECKOUT = `${WETRAVEL.env}/checkout_embed?uuid=${WETRAVEL.uuid}&wt_org=${WETRAVEL.uid}`;

  document.querySelectorAll(`a[href="${TRIP}"]`).forEach((a) => {
    a.classList.add('wtrvl-checkout_button');
    Object.assign(a.dataset, WETRAVEL);
    a.setAttribute('href', CHECKOUT);
    a.addEventListener('click', (e) => {
      if (a.isTracked) return; // WeTravel's script has taken over this button
      e.preventDefault();
      window.open(TRIP, '_blank', 'noopener');
    });
  });
})();
