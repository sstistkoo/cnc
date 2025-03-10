# CNC Sinumerik Editor

Webová aplikace pro editaci a simulaci CNC Sinumerik programů.

## Funkce

- Split-pane rozhraní pro editaci a parsování
- Dotykově přívětivý design
- Podpora souborů .mpf a .spf
- Responsivní layout
- Panel pro výběr programů
- Simulátor CNC programů (ve vývoji)

## Použití

Otevřete `index.html` v moderním webovém prohlížeči. Použijte výběr souborů pro načtení CNC programů.

### Parsování CNC kódu

Pro zobrazení parsovaného CNC kódu:

1. Načtěte CNC program kliknutím na ikonu složky nebo vyberte program ze seznamu
2. Klikněte na tlačítko "Parse" v menu nástrojů
3. Otevřete konzoli prohlížeče (F12 nebo Ctrl+Shift+I, poté vyberte "Konzole")
4. Prohlédněte si parsovaný kód a statistiky

Parser rozpoznává různé typy CNC příkazů včetně:

- Pohybové příkazy (G0, G1, G2, G3)
- Volání podprogramů (L)
- Nastavení nástroje (T, D)
- M-kódy pro speciální funkce
- Komentáře a další

## Aktuální stav

- Editor: Základní funkce implementovány
- Parser: Implementován pro základní CNC příkazy
- Simulátor: Ve vývoji

## Plánované funkce

- Parser CNC kódu
- Simulace drah nástroje
- Podpora MPF a SPF souborů
