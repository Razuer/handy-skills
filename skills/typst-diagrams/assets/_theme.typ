// =============================================================================
// Wspólny motyw diagramów (Fletcher) — jedna paleta + pomocniki dla całego
// dokumentu. Skopiuj do <root-dokumentu>/diagrams/_theme.typ i importuj w
// każdym pliku diagramu: #import "_theme.typ": *
//
// Zasada palety: jasne wypełnienia + ciemne obrysy. Dzięki temu diagram jest
// czytelny także w druku w skali szarości, a kolor jedynie grupuje etapy.
// Nazwy klas są semantyczne — zmień/rozszerz je pod domenę dokumentu.
// =============================================================================

#let c-driver  = (fill: rgb("#E8F0FE"), stroke: rgb("#1565C0")) // klient / sterownik / wejście
#let c-infra   = (fill: rgb("#ECEFF1"), stroke: rgb("#37474F")) // brama / API / infrastruktura
#let c-compute = (fill: rgb("#E0F2F1"), stroke: rgb("#00695C")) // rdzeń obliczeniowy / logika
#let c-detect  = (fill: rgb("#F3E5F5"), stroke: rgb("#6A1B9A")) // detekcja / analiza / agregacja
#let c-gate    = (fill: rgb("#FFEBEE"), stroke: rgb("#C62828")) // decyzja / bramka / warunek
#let c-forge   = (fill: rgb("#FCE4EC"), stroke: rgb("#AD1457")) // moduł wytwórczy / pipeline
#let c-mcp     = (fill: rgb("#E8F5E9"), stroke: rgb("#2E7D32")) // usługi zewnętrzne / publikacja
#let c-data    = (fill: rgb("#FFF3E0"), stroke: rgb("#E65100")) // warstwa danych / magazyn
#let c-metric  = (fill: rgb("#E0F7FA"), stroke: rgb("#00838F")) // metryki / pomiar / wynik
#let c-skip    = (fill: rgb("#F5F5F5"), stroke: rgb("#9E9E9E")) // gałąź pominięta / notatka

// Skaluje zawartość w dół, jeśli jest szersza niż dostępna szerokość (kolumna
// tekstu), tak aby diagram nigdy nie wystawał poza marginesy. Diagramy węższe
// niż tekst pozostają bez zmian (współczynnik = 1). reflow: true sprawia, że
// pomniejszony diagram zajmuje mniej miejsca i jest poprawnie wyśrodkowany w
// figurze. Opakuj każdy diagram: #let nazwa = fit-width({ ... diagram(...) }).
#let fit-width(body) = layout(size => {
  let m = measure(body)
  let f = if m.width > 0pt { calc.min(1, size.width / m.width) } else { 1.0 }
  scale(body, x: f * 100%, y: f * 100%, reflow: true)
})
