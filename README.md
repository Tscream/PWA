# Familietafel

Een eerste webapp om de installatie op iPhone te testen. Tik op **Schuif aan** om te zien of de app reageert. Deze versie werkt online en bevat alleen de testpagina.

## Publiceren op GitHub Pages

1. Ga in deze repository naar **Settings → Pages**.
2. Kies bij **Source** voor **Deploy from a branch**.
3. Kies **main** en **/docs**, en klik **Save**.
4. Gebruik de HTTPS-link die bij **Pages** verschijnt zodra de site klaar is.

Voor Pages vanuit een privérepository is een ondersteund GitHub-abonnement nodig. De gepubliceerde site van een persoonlijke repository is publiek toegankelijk. Zie de [GitHub-documentatie](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Installeren op iPhone

1. Open de gepubliceerde link in Safari.
2. Tik op **Deel → Zet op beginscherm**.
3. Zet **Open als webapp** aan als je die optie ziet en tik op **Voeg toe**.
4. Open **Familietafel** via het nieuwe icoon en tik op **Schuif aan**.

Zie ook de [iPhone-handleiding](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

## Broncode

Alles voor deze versie staat in `docs/`. Er is geen bouwstap nodig. De paden zijn relatief zodat de app ook vanuit een submap zoals `/PWA/` werkt. Accounts, passkeys en receptenopslag horen bij een volgende versie met een server.
