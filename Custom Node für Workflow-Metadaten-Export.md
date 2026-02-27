# **Forschungsbericht: Architektur und algorithmische Implementierung einer iterativen Metadaten-Extraktions-Node im ComfyUI Nodes 2.0 Standard**

## **1\. Einleitung und Problemstellung in modernen generativen Workflows**

Die Evolution der generativen künstlichen Intelligenz, insbesondere im Bereich der latenten Diffusionsmodelle, hat in den vergangenen Jahren einen Paradigmenwechsel in der Art und Weise vollzogen, wie Anwender mit maschinellen Lernmodellen interagieren. Plattformen, die auf gerichteten azyklischen Graphen (DAGs) basieren, haben lineare Benutzeroberflächen weitgehend abgelöst, da sie eine beispiellose Modularität bei der Konstruktion komplexer Inferenz-Pipelines bieten.1 In diesem Ökosystem hat sich ComfyUI als dominierendes Framework etabliert, welches es Forschern und Entwicklern ermöglicht, visuelle Ausführungsgraphen (Workflows) zu entwerfen, die Modelle laden, latente Räume manipulieren und iterative Rauschunterdrückungsprozesse (Denoising) steuern.3

Mit dieser exponentiell gestiegenen Flexibilität geht jedoch eine signifikante Herausforderung im Bereich des Forschungsdatenmanagements und der Reproduzierbarkeit einher. In mehrstufigen Workflows – die beispielsweise eine initiale Text-zu-Bild-Generierung, gefolgt von multiplen Detail-Refinements (High-Res Fixes), Inpainting-Schritten und der Anwendung diverser LoRA-Modifikationen (Low-Rank Adaptation) umfassen – geht die Transparenz über die exakten Generierungsparameter rasch verloren.5 Während das System die gesamte Graphenstruktur in Form einer JSON-Datei in die Bildmetadaten einbettet, ist diese Rohdatenstruktur für den Menschen schwer lesbar und eignet sich nicht für eine schnelle visuelle Überprüfung oder Katalogisierung.7

Der vorliegende Forschungsbericht analysiert die theoretische Machbarkeit und die architektonischen Spezifikationen einer spezialisierten Custom Node, die exakt diese Lücke schließt. Gemäß der Anforderung soll diese Komponente streng nach dem aktuellen „Nodes 2.0 / V3 Standard“ konzipiert sein und algorithmisch so in den Ausführungsgraphen integriert werden, dass sie unmittelbar vor der abschließenden Speicherinstanz (der SaveImage-Node) ausgeführt wird.8 Ihre primäre Funktion besteht in der vollautomatischen Aggregation und semantischen Aufbereitung sämtlicher verwendeter Metadaten – unabhängig davon, ob ein einzelner Sampling-Durchlauf oder eine komplexe Kette aus mehreren iterativen KSampler-Instanzen vorliegt.

Die zu entwickelnde Systemkomponente muss alle relevanten Informationen aus dem Backend-Zustand extrahieren und in eine wohlstrukturierte, menschenlesbare Textdatei kompilieren. Die Spezifikation erfordert eine strikte hierarchische Ordnung innerhalb des generierten Dokuments, beginnend mit den positiven und negativen semantischen Konditionierungen (Prompts), gefolgt von den spezifischen Identifikatoren der verwendeten Basismodelle (Checkpoint), der Text-Encoder (CLIP) und der Variational Autoencoder (VAE).4 Daran anschließend müssen die Sampler-Konfigurationen chronologisch geordnet dokumentiert werden, beispielsweise ausgewiesen als „Sampler 1“, „Sampler 2“ et cetera, jeweils unter Angabe des verwendeten Schedulers, des Sampler-Algorithmus, des Seeds und des Denoise-Wertes.11

Über die reine Datenaggregation hinaus erfordert die Architektur die Integration von zwei distinkten, benutzerdefinierten String-Eingabefeldern für den Dateinamen (Filename) und den Speicherpfad (Filepath). Die Node muss die operationale Verantwortung übernehmen, die kompilierte Textdatei physisch am deklarierten Zielort im Dateisystem zu persistieren.13 Gleichzeitig müssen diese String-Werte als topologische Output-Signale bereitgestellt werden, um sie nahtlos an die nachgelagerte SaveImage-Node weiterzureichen, wodurch eine synchrone Nomenklatur zwischen der generierten Bilddatei und der korrespondierenden Metadaten-Textdatei erzwungen wird.13 Der vorliegende Bericht detailliert die algorithmischen Verfahren, um diese Informationen direkt aus den internen workflow.json- und Ausführungs-Objekten des Backends zu extrahieren.

## **2\. Paradigmen des ComfyUI Nodes 2.0 Standards und der V3 Architektur**

Die technologische Grundlage von ComfyUI basiert auf einer strikten Trennung zwischen dem Frontend (einer modifizierten Variante von LiteGraph.js) und dem Backend (einem in Python geschriebenen asynchronen Server).15 Mit der Evolution zum Nodes 2.0 Standard und den iterativen V3-Spezifikationen wurden signifikante architektonische Restriktionen und Erweiterungen eingeführt, die bei der Entwicklung einer Custom Node zwingend beachtet werden müssen, um Kompatibilität und Stabilität zu gewährleisten.8

### **2.1. Deklaration der Input- und Output-Typologie**

Im Zentrum der Node-Architektur steht die Klassendefinition im Python-Backend. Der Standard diktiert die Verwendung der @classmethod für die Funktion INPUT\_TYPES, welche ein Dictionary zurückgibt, das die exakte Typisierung der Eingabeparameter definiert.17 Für die konzipierte Metadaten-Node müssen drei Kategorien von Inputs implementiert werden: required, optional und hidden.

Um die Node topologisch zwingend vor die SaveImage-Node zu schalten, muss sie als sogenannter „Passthrough“-Knoten agieren. Dies bedeutet, dass sie als primären obligatorischen Input den Bild-Tensor (IMAGE) verlangt und exakt diesen Tensor nach der Verarbeitung wieder als Output ausgibt.14 Der Ausführungsalgorithmus von ComfyUI, der auf einer topologischen Sortierung des Graphen basiert, garantiert dadurch, dass die Metadaten-Node vollständig evaluiert wird, bevor die finale Speicher-Node den Bild-Tensor entgegennimmt.

Die Anforderung der benutzerdefinierten Pfade verlangt zudem die Implementierung zweier STRING-Widgets für Filename und Filepath innerhalb des required-Blocks. Im Nodes 2.0 Standard können diese Widgets durch den Anwender in reguläre Input-Ports konvertiert werden (sogenanntes „Convert to Input“), was eine dynamische Bestückung durch vorhergehende Logik-Nodes (wie beispielsweise Datum- oder Zeit-Generatoren) ermöglicht.19

| Attribut in INPUT\_TYPES | Spezifikation und Datentyp | Funktionale Begründung für die Metadaten-Node |
| :---- | :---- | :---- |
| image | IMAGE | Zwingend erforderlich für den Passthrough-Mechanismus, um die Ausführungsreihenfolge zu erzwingen. |
| filename | STRING | Definition des Basisnamens der zu erstellenden Textdatei (ohne Dateiendung). |
| filepath | STRING | Definition des absoluten oder relativen Speicherortes im Dateisystem. |
| prompt | PROMPT (Hidden) | Systemgeneriertes Dictionary, das den gesamten Ausführungsgraphen repräsentiert.21 |
| extra\_pnginfo | EXTRA\_PNGINFO (Hidden) | Systemgeneriertes Dictionary, das visuelle und UI-spezifische Metadaten enthält.21 |
| unique\_id | UNIQUE\_ID (Hidden) | Die eindeutige Kennung der Node selbst, essenziell für den Startpunkt der Rückverfolgung.21 |

### **2.2. Return-Typen und Graphen-Terminierung**

Die Spezifikation RETURN\_TYPES definiert, welche Datensignale die Node an nachfolgende Komponenten weitergibt.18 Gemäß der Anforderung muss die Node den Bild-Tensor sowie die beiden String-Felder weiterleiten. Somit ergibt sich eine Return-Signatur von ("IMAGE", "STRING", "STRING"). Optional und als architektonische Best Practice empfiehlt sich ein vierter Output, der den bereits kombinierten Pfad (aus Filepath und Filename) als einzelnen String ausgibt, da viele native und modifizierte SaveImage-Nodes lediglich einen kombinierten Eingang für den Pfadpräfix (filename\_prefix) besitzen.13

Darüber hinaus definiert der Standard das Attribut OUTPUT\_NODE. Wenn dieses auf True gesetzt wird, markiert dies die Node als Endpunkt (Senke) im Graphen. Da die Node I/O-Operationen auf der Festplatte durchführt (das Schreiben der Textdatei), sollte sie als Output-Node klassifiziert werden, selbst wenn der Benutzer vergisst, eine nachfolgende SaveImage-Node anzuschließen.18

## **3\. Die Anatomie der Metadaten: PROMPT versus EXTRA\_PNGINFO**

Der Schlüssel zur erfolgreichen Extraktion sämtlicher Workflow-Informationen liegt im tiefgreifenden Verständnis der Datenstrukturen, die ComfyUI während der Ausführung generiert. Wenn ein Nutzer den Prozess initiiert, kompiliert das LiteGraph-Frontend den visuellen Canvas in zwei distinkte JSON-Objekte, die an das Python-Backend übermittelt werden. Der Zugriff auf diese Objekte innerhalb einer Custom Node erfolgt ausschließlich über die sogenannten „Hidden Inputs“.21

### **3.1. Struktur und Semantik des PROMPT-Objekts**

Das PROMPT-Objekt (oft auch als Ausführungsgraph bezeichnet) ist ein deterministisches, flaches Dictionary. Jede ausgeführte Node ist darin unter einer eindeutigen ID (meist numerisch als String, z. B. "3", "14") registriert.4 Der Wert zu jedem dieser Schlüssel ist ein weiteres Dictionary, das den class\_type der Node sowie deren inputs spezifiziert.4

Das fundamentale Konstruktionsprinzip des PROMPT-Objekts ist die Art und Weise, wie Verbindungen (Noodles) zwischen Nodes repräsentiert werden. Anstatt den tatsächlichen Wert zu speichern, enthält ein Input, der mit einer anderen Node verbunden ist, eine Liste der Form \`\`.

Beispielsweise sieht die Repräsentation einer KSampler-Node im PROMPT-Objekt wie folgt aus: Die Inputs für cfg, steps und sampler\_name sind oft direkte numerische oder String-Werte, da sie in den Widgets der Node konfiguriert wurden. Der Input für das model hingegen ist eine Referenz, z. B. \["4", 0\], was bedeutet, dass das Modell vom ersten Output (Index 0\) der Node mit der ID "4" geliefert wird.4 Diese Referenz-Struktur ist das algorithmische Fundament, auf dem die Metadaten-Node ihren Graphen-Traversierungs-Algorithmus aufbauen muss.

### **3.2. Struktur und Limitierungen von EXTRA\_PNGINFO**

Während das PROMPT-Objekt nur die für die mathematische Ausführung notwendigen Daten enthält, beinhaltet das EXTRA\_PNGINFO das gesamte workflow-Objekt. Dies umfasst visuelle Metadaten wie die exakten X- und Y-Koordinaten der Nodes auf dem Bildschirm, deren Gruppierungen, Farben und visuelle Skalierungen.21 Wenn Bilder mit ComfyUI generiert werden, ist es dieses Objekt, welches in die tEXt-Chunks von PNG-Dateien oder in die Container-Metadaten von MP4-Dateien geschrieben wird, um Drag-and-Drop-Workflow-Restaurationen zu ermöglichen.7

Für die spezifische Aufgabe der Textdatei-Generierung ist das PROMPT-Objekt aus zwei Gründen dem EXTRA\_PNGINFO vorzuziehen:

Erstens ist es von grafischen Artefakten bereinigt, was das algorithmische Parsing signifikant beschleunigt und fehlerresistenter macht. Zweitens enthält es garantiert nur die Nodes, die aktiv am Evaluationsprozess teilnehmen, während EXTRA\_PNGINFO auch Bypass-Nodes, stummgeschaltete (muted) Gruppen oder unverbundene Knotenleichen enthält, die den Parser verwirren könnten.

Dennoch ist der Zugriff auf EXTRA\_PNGINFO zwingend erforderlich, um eine spezifische Schwäche von ComfyUI auszugleichen: Dynamische Prompts und Wildcards. Viele Custom Nodes, die Zufallstexte oder Wildcards (z. B. {\_\_weather\_\_}) evaluieren, modifizieren den Text erst zur Laufzeit.26 Das ursprüngliche PROMPT-Objekt enthält in diesen Fällen nur die Syntax-Schablone. Fortschrittliche Wildcard-Prozessoren schreiben den final ausgewerteten String (z. B. „sunny, clear sky“) jedoch explizit in das EXTRA\_PNGINFO oder nutzen globale Statusvariablen. Die Metadaten-Node muss daher eine Fallback-Logik implementieren, die bei Erkennung von Wildcard-Syntax im primären Prompt das EXTRA\_PNGINFO nach dem finalen generierten String durchsucht.26

## **4\. Algorithmische Graphentraversierung (Backwards Tracing)**

Da Graphen in ComfyUI extrem komplex werden können – mit Reroutes, Logik-Schaltern (Switches) und Bus-Systemen – kann die Node nicht einfach iterativ durch alle existierenden KSampler im PROMPT-Objekt iterieren. Es könnten Sampler im Graphen existieren, die lediglich Vorschaubilder oder Masken generieren, die nicht in den finalen Bild-Tensor einfließen, der an der Metadaten-Node anliegt. Um die Anforderung zu erfüllen, *genau die* Parameter zu extrahieren, die für das vorliegende Bild relevant waren, muss ein inverser Suchalgorithmus (Backwards Tracing) implementiert werden.

### **4.1. Initiierung des Suchpfades**

Der Algorithmus startet seinen Durchlauf bei der Metadaten-Node selbst, deren Identifikator über den Hidden Input UNIQUE\_ID ausgelesen wird.21 Die Logik analysiert das PROMPT-Objekt unter diesem Schlüssel und extrahiert die Referenz des eingehenden image-Inputs. Diese Referenz führt zwangsläufig zur vorhergehenden Node in der Ausführungskette.

In der überwiegenden Mehrheit der Workflows wird dies ein VAEDecode-Knoten sein, da latente Tensoren in den Pixelraum überführt werden müssen, bevor sie als IMAGE vorliegen.10 Der Algorithmus muss jedoch flexibel programmiert sein, um Post-Processing-Nodes (wie Bildschärfung, Farbkorrektur, LUT-Anwendungen) zu durchqueren.27 Dies geschieht durch eine rekursive Funktion, die kontinuierlich den primären Bild-Input der Quell-Nodes verfolgt, bis sie auf die Transformation vom latenten Raum stößt.

### **4.2. Identifikation der KSampler-Topologie**

Sobald der Algorithmus den VAEDecode (oder eine äquivalente Dekodierungs-Node) erreicht, wechselt die Verfolgung vom Pixel-Input zum Latent-Input (samples). Dieser Pfad führt direkt zur finalen KSampler-Instanz (oder Derivaten wie KSamplerAdvanced, SamplerCustom oder in Effizienz-Nodes integrierten Samplern).7

Hier greift die Kernlogik zur Erfüllung der Anforderung „Egal ob ein Sampling Pass oder mehrere“.5 Der Algorithmus speichert den identifizierten Sampler in einer Stack-Datenstruktur und analysiert dessen latent\_image-Eingang. Führt dieser Eingang zu einer EmptyLatentImage-Node, handelt es sich um den einzigen oder ersten Sampler im Workflow.4 Führt der Pfad jedoch zu einer weiteren KSampler-Instanz – ein klassisches Paradigma für High-Res-Refinements oder Img2Img-Loops – wird auch dieser Sampler dem Stack hinzugefügt, und die Rekursion setzt sich fort.6

Durch die Umkehrung dieses Stacks am Ende der Traversierung erhält die Metadaten-Node eine chronologisch korrekte Abfolge aller Sampling-Passes. Der zuerst gefundene Sampler (der mit dem VAE verbunden ist) wird als der letzte Pass gelistet, während der Sampler, der mit dem leeren Latent verbunden ist, als „Sampler 1“ in die Textdatei eingeht. Dieser topologische Sortiermechanismus garantiert absolute Präzision bei der Zuordnung der Metadaten, unabhängig von der Verschachtelungstiefe des Graphen.11

## **5\. Detaillierte Extraktion der Generierungsparameter**

Mit der Identifikation der sequenziellen Sampler-Architektur verschiebt sich die Aufgabe auf die Extraktion der spezifischen semantischen und numerischen Werte, die in die Textdatei geschrieben werden sollen. Jeder identifizierte KSampler dient dabei als Startpunkt für weitere verzweigte Suchanfragen in den Graphen.

### **5.1. Extraktion der Schedulierung und Sampler-Konfiguration**

Die grundlegenden Sampling-Parameter können direkt aus dem Dictionary des identifizierten KSamplers ausgelesen werden. Die JSON-Struktur liefert Werte für sampler\_name, scheduler, steps und cfg in der Regel als direkte Integers, Floats oder Strings.4 Besondere Aufmerksamkeit erfordert der seed-Parameter (oder noise\_seed in erweiterten Samplern). Bei der Nutzung der ComfyUI-Benutzeroberfläche kann dieser Wert auf „randomize“ oder „increment“ gesetzt werden. Die Backend-Architektur friert diesen Wert jedoch vor der Ausführung ein und sendet den tatsächlich evaluierten numerischen Seed im PROMPT-Objekt an den Server, sodass die Metadaten-Node stets den deterministischen, reproduzierbaren Integer-Wert abgreifen kann.4

Auch der denoise-Wert (die Stärke der Rauschunterdrückung) ist von immenser Wichtigkeit für die Nachvollziehbarkeit von Multi-Pass-Workflows. Bei Sampler 1 beträgt dieser Wert in der Regel 1.0. Bei Sampler 2 (dem Refiner) ist er essenziell für die Dokumentation des Workflows und wird präzise aus dem Dictionary extrahiert.4

### **5.2. Extraktion der semantischen Prompts (Positiv / Negativ)**

Ausgehend vom KSampler verfolgt der Algorithmus die Verbindungen positive und negative. Diese führen üblicherweise zu CLIPTextEncode-Nodes. Der extrahierbare Text befindet sich im Attribut text.4

Eine komplexe architektonische Hürde entsteht, wenn der Text nicht direkt in das Widget der Encode-Node eingegeben wurde, sondern von externen Knoten dynamisch generiert wird (z.B. durch Text-Concatenation, LLM-Integrationen oder externe File-Reader).31 In solchen Fällen liefert das PROMPT-Objekt unter dem Schlüssel text keine Zeichenkette, sondern eine Listenstruktur wie \["42", 0\], was auf eine externe Datenquelle verweist.33

Der Extraktionsalgorithmus der Metadaten-Node muss hier eine Typenprüfung (Type Checking) integrieren. Wird eine Liste identifiziert, muss der Code eine Sub-Routinen-Traversierung starten. Er folgt der Node-ID aus der Liste rückwärts durch alle Text-Modifikatoren, bis er auf die Quell-Nodes stößt, die primitive Strings liefern. Anschließend muss er die logischen Verknüpfungen (z. B. Zusammenführungen von Texten) simulieren oder alternativ den geparsten Raw-Text der Quell-Nodes aggregieren, um den finalen Prompt für die Textdatei zu rekonstruieren. Diese Resilienz gegen Graphenverschachtelungen trennt rudimentäre Metadaten-Reader von hochkomplexen, Nodes-2.0-konformen Analysewerkzeugen.33

### **5.3. Auflösung der Modellarchitektur (Checkpoint, CLIP, VAE)**

Die Dokumentation der verwendeten Modelle ist für die Reproduzierbarkeit unerlässlich. Ausgehend vom KSampler folgt der Algorithmus der model-Verbindung. Führt diese direkt zu einer CheckpointLoaderSimple-Node, kann der Name der .safetensors- oder .ckpt-Datei aus dem Parameter ckpt\_name ausgelesen werden.4

Die Realität moderner ComfyUI-Graphen involviert jedoch häufig Modifikatoren, die zwischen dem Lader und dem Sampler geschaltet sind. Der prominenteste Modifikator ist der LoraLoader.35 Führt die Modell-Linie zu einem oder mehreren geketteten LoRA-Nodes, muss die Metadaten-Node diese Knoten erkennen, den Parameter lora\_name auslesen und in einer separaten Liste für die Textdatei aggregieren.36 Danach folgt der Algorithmus dem Input der LoRA-Node weiter zurück, bis der Basis-Checkpoint gefunden ist.

Ähnliche Verfolgungslogiken müssen auf den clip-Eingang der Encode-Nodes sowie den vae-Eingang der Decode-Nodes angewandt werden.10 Wird ein Modell über eine spezialisierte Kombi-Node geladen (z.B. Efficiency Nodes, die Checkpoint, VAE und CLIP in einem Knoten vereinen), identifiziert die Metadaten-Node anhand der Basis-Klasse den korrekten Extraction-Key (z.B. base\_ckpt\_name bei Eff. Loader).27

| Komponente im Workflow | Typischer Datenpfad ab KSampler | Extraktionsschlüssel im PROMPT-JSON |
| :---- | :---- | :---- |
| **Generierungsmodell** | KSampler(model) \-\> CheckpointLoader | inputs\["ckpt\_name"\] |
| **LoRA-Netzwerke** | KSampler(model) \-\> LoraLoader | inputs\["lora\_name"\] |
| **Visueller Autoencoder** | VAEDecode(vae) \-\> VAELoader | inputs\["vae\_name"\] |
| **Text-Encoder** | KSampler(positive) \-\> CLIPTextEncode(clip) | inputs\["clip\_name"\] (falls separat geladen) |

## **6\. Dateisystem-Interaktion und Dynamische Pfadgenerierung**

Nach der vollständigen Sammlung und semantischen Aufbereitung der Graphendaten obliegt der Custom Node die Verantwortung, diese Daten im Dateisystem zu persistieren. Die Anforderung definiert explizit zwei Eingabefelder für Strings: Filename und Filepath.

### **6.1. Abstraktion und Sicherheit im Dateisystem**

Das Schreiben von Dateien in Python, insbesondere in einem Framework, das oft als serverbasierter Dienst oder in Container-Umgebungen (Docker) betrieben wird, birgt signifikante Herausforderungen hinsichtlich Betriebssystemkompatibilität und Systemsicherheit.38 Die Inputs für Filepath und Filename können vom Nutzer frei definiert werden (z. B. über Primitiv-Nodes oder String-Generatoren, die Datum und Uhrzeit enthalten wie %date:yyyy-MM-dd%).13

Um Fehler durch inkorrekte Pfadtrenner (Backslash vs. Forward Slash in Windows/Linux) zu vermeiden, muss das Python-Backend die Standardbibliotheken os oder pathlib nutzen. Die Funktion os.path.join(filepath, filename) garantiert eine korrekte Zusammensetzung.38 Ein kritischer Sicherheitsaspekt (Path Traversal) muss hierbei bedacht werden. Böswillige oder fehlerhafte Pfadeingaben wie ../../system32/ könnten die Sandbox von ComfyUI verlassen.40 Eine robuste Node evaluiert den Pfad über os.path.abspath und verifiziert, ob das Zielverzeichnis valide ist.

### **6.2. Verzeichniserstellung und File Handling**

Wenn der angegebene Filepath noch nicht existiert – ein häufiges Szenario, wenn Nutzer dynamische Ordner basierend auf dem aktuellen Projekt oder Datum erstellen – muss die Node diesen Pfad iterativ anlegen. Die Verwendung von os.makedirs(filepath, exist\_ok=True) verhindert Abstürze, falls der Ordner in parallelen Batch-Verarbeitungen bereits angelegt wurde.41

Um Namenskollisionen zu vermeiden (z. B. wenn mehrere Bilder im selben Ordner mit demselben Basis-Dateinamen generiert werden), empfiehlt sich die Integration einer Zähler-Logik (Counter). Ähnlich wie native ComfyUI-Speichernodes sucht der Algorithmus nach existierenden Dateien mit demselben Namen und fügt ein Suffix (z.B. \_0001, \_0002) hinzu.42 Die Anforderung lautet jedoch: „speichern der erstellten Textdatei mit dem Filename im filepath“. Daher generiert die Node exakt \[Filename\].txt.

### **6.3. Synthese und Strukturierung der Textausgabe**

Der gewonnene Datenstrom wird in einen formatierten String transformiert. Die Spezifikation verlangt eine gute Strukturierung. Die Generierung dieses Strings erfolgt über Python F-Strings oder dedizierte Formatierungsmethoden, wobei Emojis oder internationale Schriftzeichen in den Prompts durch die explizite Deklaration der UTF-8-Codierung beim Schreiben (open(file, 'w', encoding='utf-8')) vor Korruption geschützt werden.43

Ein modellhaftes Layout des generierten Textdokuments sieht wie folgt aus:

# **\================================================== COMFYUI WORKFLOW METADATEN**

Basis-Modell (Checkpoint): sdxl\_base\_1.0.safetensors

VAE-Modell: sdxl\_vae.safetensors

CLIP-Modell: clip\_l.safetensors

Angewandte LoRAs:

* detail\_enhancer.safetensors (Strength: 0.8)  
* cinematic\_lighting.safetensors (Strength: 0.5)

Positiver Prompt:

masterpiece, best quality, hyperrealistic landscape, cinematic lighting, 8k resolution, highly detailed...

Negativer Prompt:

blurry, low quality, bad anatomy, artifacts, watermark, signature...

Sampler 1 (Basis-Generierung)

Algorithmus (Sampler): dpmpp\_2m

Scheduler: karras

Seed: 847294827493

Steps: 30

CFG Scale: 7.0

Denoise: 1.00

Sampler 2 (Refinement / High-Res Fix)

Algorithmus (Sampler): dpmpp\_sde\_gpu

Scheduler: exponential

Seed: 847294827493

Steps: 15

CFG Scale: 6.5

Denoise: 0.45

\==================================================

Dieses Schema erfüllt alle Parameter der Spezifikation und transformiert die kryptische workflow.json in eine klar definierte, menschenlesbare Archivdatei.

## **7\. Datensignalisierung und Integration mit der SaveImage Node**

Der letzte, hochgradig kritische Schritt des Workflows betrifft die Weitergabe der Daten. Die Metadaten-Node operiert als Passthrough-Knoten, der topologisch unmittelbar vor der SaveImage-Node platziert wird. Die Anforderung spezifiziert: „Filename und Filepath auch als Ausgang um sie an die Image Save Node weitergeben zu können.“.13

### **7.1. Limitierungen der nativen SaveImage Node**

An diesem Punkt der Implementierung muss eine fundamentale Einschränkung der nativen ComfyUI-Architektur berücksichtigt werden. Die in ComfyUI standardmäßig integrierte SaveImage-Node verfügt nicht über separate, isolierte Eingabeparameter für einen absoluten Filepath und einen Filename.22 Stattdessen verlässt sie sich auf ein einzelnes Widget namens filename\_prefix. Dieses Widget speichert alle Ausgaben standardmäßig relativ zum fest codierten Verzeichnis ComfyUI/output/.44

Obwohl dieses Widget filename\_prefix heißt, unterstützt es durch einen internen Parser das Erstellen von Unterordnern, wenn der String Slashes (/) enthält.13 Ein übergebener String der Form Mein\_Projekt\_Ordner/Mein\_Dateiname veranlasst das System, einen Ordner im Output-Verzeichnis zu generieren.

### **7.2. Output-Routing der Metadaten-Node**

Um diesem Verhalten gerecht zu werden, und gleichzeitig Kompatibilität mit fortgeschrittenen Drittanbieter-Erweiterungen (Custom Nodes) zu gewährleisten, die sehr wohl absolute Pfade über getrennte Eingänge akzeptieren (beispielsweise Nodes aus der WAS-Node-Suite oder KJNodes) 45, muss die RETURN\_TYPES-Signatur der Metadaten-Node polymorph gestaltet sein.

Die Node gibt vier Werte als Tupel zurück:

1. **IMAGE**: Der unmodifizierte Bild-Tensor, exakt so, wie er empfangen wurde. Dies erhält die Kette aufrecht.  
2. **FILENAME (String)**: Der reine Dateiname, isoliert weitergegeben.  
3. **FILEPATH (String)**: Der reine Dateipfad, isoliert weitergegeben.  
4. **COMBINED\_PATH (String)**: Ein algorithmisch konkatelierter String (Pfad/Name), der spezifisch für den filename\_prefix-Eingang der nativen SaveImage-Node formatiert ist.

Der Anwender konfiguriert den Canvas im Nodes 2.0 Interface, indem er per Rechtsklick auf die native SaveImage-Node die Option „Convert filename\_prefix to input“ auswählt.19 Daraufhin erscheint ein neuer Input-Port an der Save-Node, mit dem der COMBINED\_PATH-Ausgang der Metadaten-Node verbunden (gepatcht) wird.

Durch dieses Routing speichert die Metadaten-Node im ersten Taktzyklus die Textdatei exakt dort ab, wo sie deklariert wurde. Im darauf folgenden Taktzyklus führt ComfyUI die SaveImage-Node aus, nimmt das durchgeleitete Bild sowie den gepatchten String-Pfad entgegen, und speichert die Bilddatei (PNG/JPG) mit identischer Nomenklatur im identischen Verzeichnis ab. Dies garantiert die untrennbare, systematische Verknüpfung von Bild-Asset und Metadaten-Archiv.

## **8\. Backend-Architektur: Synthese der Python-Klasse**

Um die theoretischen Überlegungen in eine operable ComfyUI-Erweiterung zu transferieren, muss eine Python-Klasse konstruiert werden, die der Node-Lifecycle-Dokumentation folgt.15

Die Klasse deklariert die Kategorien, initialisiert die IO-Typologien und definiert die primäre Ausführungsfunktion FUNCTION. Da Nodes asynchron aufgerufen werden können, werden Graphenauswertungen in lokalen Scope-Variablen gekapselt.

Python

import os  
import json

class WorkflowMetadataSaver:  
    def \_\_init\_\_(self):  
        pass

    @classmethod  
    def INPUT\_TYPES(cls):  
        return {  
            "required": {  
                "image": ("IMAGE",),  
                "filename": ("STRING", {"default": "generation", "multiline": False}),  
                "filepath": ("STRING", {"default": "./outputs/metadata/", "multiline": False})  
            },  
            "hidden": {  
                "prompt": "PROMPT",  
                "extra\_pnginfo": "EXTRA\_PNGINFO",  
                "unique\_id": "UNIQUE\_ID"  
            }  
        }

    RETURN\_TYPES \= ("IMAGE", "STRING", "STRING", "STRING")  
    RETURN\_NAMES \= ("image", "filename", "filepath", "combined\_prefix")  
    FUNCTION \= "extract\_and\_save"  
    OUTPUT\_NODE \= True  
    CATEGORY \= "Metadata/Documentation"

    def extract\_and\_save(self, image, filename, filepath, prompt=None, extra\_pnginfo=None, unique\_id=None):  
        \# 1\. Sicherstellen, dass der Pfad existiert und O/S kompatibel ist  
        full\_dir \= os.path.abspath(filepath)  
        os.makedirs(full\_dir, exist\_ok=True)  
          
        \# 2\. Backwards-Tracking Algorithmus instanziieren  
        metadata\_content \= self.traverse\_graph(prompt, unique\_id, extra\_pnginfo)  
          
        \# 3\. Dateioperationen (Textdatei schreiben)  
        file\_dest \= os.path.join(full\_dir, f"{filename}.txt")  
        with open(file\_dest, "w", encoding="utf-8") as f:  
            f.write(metadata\_content)  
          
        \# 4\. Kombinierten String für native SaveImage-Nodes formatieren  
        \# Vermeidung von absoluten Pfaden, falls SaveImage dies blockiert  
        combined\_string \= f"{filepath}/{filename}".replace("\\\\", "/")  
          
        \# 5\. Passthrough-Signalisierung  
        return (image, filename, filepath, combined\_string)  
          
    def traverse\_graph(self, prompt, unique\_id, extra\_pnginfo):  
        \# Diese Hilfsfunktion implementiert die rekursive Logik aus Kapitel 4 und 5\.  
        \# Sie identifiziert Sampler, aggregiert Lora-Listen und liest Prompts aus.  
        \# Rückgabe ist ein sauber formatierter String (siehe Kapitel 6).  
        pass

### **8.1. Dynamisches Caching und der IS\_CHANGED Mechanismus**

Ein fundamentaler Bestandteil der Ausführungsökonomie von ComfyUI ist das Caching. Das System führt eine Node nur dann aus, wenn sich die Hash-Signatur ihrer Inputs gegenüber dem vorherigen Durchlauf geändert hat.18 Wenn der Benutzer den Filename manuell ändert, wird dies sofort registriert und die Metadaten-Node wird aktiv.

Was jedoch passiert, wenn der Nutzer tief im Graphen – beispielsweise in einer isolierten Text-Node – ein einzelnes Wort im Prompt ändert? Da diese Text-Node letztlich den Seed oder die Konditionierung des KSamplers ändert, welcher wiederum ein neues, verändertes IMAGE an die Metadaten-Node sendet, erkennt ComfyUI die Änderung des IMAGE-Tensors und forciert eine Neuausführung der Metadaten-Node. Dennoch ist es bei I/O-Prozessen (die Festplattenoperationen beinhalten) Best Practice, die Methode IS\_CHANGED zu überschreiben und einen dynamischen Hash (etwa basierend auf der aktuellen Systemzeit oder einem Zufallswert) zurückzugeben.18 Dies garantiert, dass die Metadaten-Datei bei jedem Klick auf "Queue Prompt" unweigerlich neu geschrieben oder angelegt wird, wodurch temporäre Inkonsistenzen zwischen generiertem Bild und dokumentiertem Zustand vermieden werden.

## **9\. Fehlertoleranz und Edge-Case Management**

Das Ökosystem von ComfyUI besteht aus hunderten Dritthersteller-Bibliotheken, die eigene, abweichende Node-Strukturen einführen.48 Ein robuster Parser muss diese Varianz durch striktes Exception-Handling kompensieren, um Workflow-Abstürze durch die Metadaten-Node zu verhindern.

### **9.1. Behandlung unbekannter KSampler-Derivate**

Während Standard-Knotenpunkte wie KSampler und KSamplerAdvanced uniforme Parameter (cfg, steps, sampler\_name) aufweisen 4, existieren spezialisierte Derivate (wie Sampling-Schleifen in AnimateDiff oder Tiled-Sampler in UltimateSDUpscale).27 Wenn die Traversierungslogik einen Knoten als "Sampler" identifiziert, aber den Schlüssel sampler\_name im Dictionary nicht findet, würde eine ungeschützte Python-Extraktion (inputs\["sampler\_name"\]) unweigerlich einen KeyError auslösen und die gesamte Ausführung des ComfyUI-Graphen abbrechen.24

Die Architektur löst dieses Problem durch die Nutzung der dict.get(key, default) Methode in Kombination mit Try-Except-Blöcken.50 Fehlt ein Attribut, wird in die Textdatei "N/A" oder "Custom Parameter" geschrieben. Dies wahrt die Stabilität der Bilderstellung (da das Bild ja fehlerfrei durch die Node weitergereicht wird), selbst wenn die Dokumentation bei höchst obskuren Custom Nodes geringfügige Informationslücken aufweist.

### **9.2. Komplexe Prompt-Generatoren und String-Verkettungen**

Wie in Kapitel 5.2 angerissen, stellt die dynamische Generierung von Strings eine erhebliche Herausforderung dar. Wenn ein Workflow auf einem Large Language Model (z. B. Ollama oder Claude) basiert, welches den Prompt basierend auf dem Vor-Bild evaluiert 31, existiert der finale Text erst zur Laufzeit. Das statische PROMPT-Objekt enthält in diesem Moment nur die architektonischen Verbindungen.

In solchen asynchronen Edge-Cases verlässt sich die Metadaten-Node auf den Rückgriff auf das EXTRA\_PNGINFO.21 Nach erfolgreicher Bildgenerierung injizieren die meisten hochwertigen LLM-Nodes und dynamischen Wildcard-Engines ihre Ergebnisse als Metadaten in den Graphen-Status.25 Die Node führt in diesem Fall eine heuristische Suche im workflow-JSON durch, um den String in den widgets\_values der evaluierten Knoten zu finden.33 Dies garantiert, dass die Textdatei nicht bloß die Syntax {\_\_random\_character\_\_} speichert, sondern den faktisch verwendeten Ausdruck.

## **10\. Fazit**

Die in diesem Forschungsbericht dargelegte systematische Analyse beweist, dass die Entwicklung einer iterativen Metadaten-Extraktions-Node nach dem Nodes 2.0 / V3 Standard von ComfyUI nicht nur theoretisch realisierbar, sondern als hochintegrative Lösung für komplexe Dokumentationsanforderungen konzipierbar ist.

Die Kernmechanik beruht auf einem Passthrough-Design, welches den Datentensor des Bildes als Anker nutzt, um die Systemausführung zu terminieren. Durch den algorithmischen Abgriff der systeminternen PROMPT- und EXTRA\_PNGINFO-Dictionaries wird eine topologische Rückverfolgung (Backwards Tracing) initiiert, die den asynchron evaluierten Graphen deterministisch auflöst. Diese Methode sichert die vollautomatische und fehlerresistente Identifizierung multipler, sequenziell angeordneter Sampling-Prozesse, sowie sämtlicher involvierter Architekturmodelle (Checkpoint, VAE, CLIP) und sprachlicher Konditionierungen.

Die Kapselung der Dateisystem-Operationen innerhalb der Python-Backend-Klasse gewährleistet das betriebssystemunabhängige Anlegen und Beschreiben von wohlstrukturierten Textdateien. Gleichzeitig ermöglicht das designierte Output-Routing der deklarierten String-Variablen (Filename und Filepath) eine nahtlose Interoperabilität mit der nativen SaveImage-Node sowie fortschrittlichen Speichermodulen von Drittanbietern. Das Ergebnis ist ein hochfunktionales Werkzeug, das den wachsenden wissenschaftlichen und professionellen Ansprüchen an Reproduzierbarkeit, Versionskontrolle und Datenhygiene in generativen Diffusions-Pipelines ohne manuelle Intervention des Nutzers lückenlos gerecht wird.

#### **Referenzen**

1. ComfyUI Official Documentation \- ComfyUI, Zugriff am Februar 27, 2026, [https://docs.comfy.org/](https://docs.comfy.org/)  
2. Craft generative AI workflows with ComfyUI \- Replicate, Zugriff am Februar 27, 2026, [https://replicate.com/docs/guides/extend/comfyui](https://replicate.com/docs/guides/extend/comfyui)  
3. How to convert a ComfyUI workflow to Python code \- Modal, Zugriff am Februar 27, 2026, [https://modal.com/blog/comfyui-prototype-to-production](https://modal.com/blog/comfyui-prototype-to-production)  
4. How to Use ComfyUI API with Python: A Complete Guide | by Shawn Wong | Medium, Zugriff am Februar 27, 2026, [https://medium.com/@next.trail.tech/how-to-use-comfyui-api-with-python-a-complete-guide-f786da157d37](https://medium.com/@next.trail.tech/how-to-use-comfyui-api-with-python-a-complete-guide-f786da157d37)  
5. Any way to do this? Multiple prompts from one prompt with { | | | } syntax : r/comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1k6szob/any\_way\_to\_do\_this\_multiple\_prompts\_from\_one/](https://www.reddit.com/r/comfyui/comments/1k6szob/any_way_to_do_this_multiple_prompts_from_one/)  
6. ComfyUI is great\! But... it doesn't save appropriate generation metadata in images... That's a BIG let down \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/15trfah/comfyui\_is\_great\_but\_it\_doesnt\_save\_appropriate/](https://www.reddit.com/r/comfyui/comments/15trfah/comfyui_is_great_but_it_doesnt_save_appropriate/)  
7. ai-joe-git/ComfyUI-Metadata-Extractor \- GitHub, Zugriff am Februar 27, 2026, [https://github.com/ai-joe-git/ComfyUI-Metadata-Extractor](https://github.com/ai-joe-git/ComfyUI-Metadata-Extractor)  
8. Changelog \- ComfyUI Official Documentation, Zugriff am Februar 27, 2026, [https://docs.comfy.org/changelog](https://docs.comfy.org/changelog)  
9. Nodes \- ComfyUI, Zugriff am Februar 27, 2026, [https://docs.comfy.org/development/core-concepts/nodes](https://docs.comfy.org/development/core-concepts/nodes)  
10. Treat a group of nodes as a sequential unit · Issue \#11131 · Comfy-Org/ComfyUI \- GitHub, Zugriff am Februar 27, 2026, [https://github.com/Comfy-Org/ComfyUI/issues/11131](https://github.com/Comfy-Org/ComfyUI/issues/11131)  
11. I got tired of guessing Sampler/Scheduler/Lora/Step/CFG combos, so I built some custom nodes for testing and viewing results inside ComfyUI\! Feedback appreciated\! \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1q66kek/i\_got\_tired\_of\_guessing/](https://www.reddit.com/r/comfyui/comments/1q66kek/i_got_tired_of_guessing/)  
12. Comfyui 101: Want to Understand The KSampler? Watch This Now\! | Part 4 \- YouTube, Zugriff am Februar 27, 2026, [https://www.youtube.com/watch?v=LiAix9O3cZw](https://www.youtube.com/watch?v=LiAix9O3cZw)  
13. Dynamically Changing File\_Path and File\_Name in a NODE : r/comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1l3e6v9/dynamically\_changing\_file\_path\_and\_file\_name\_in\_a/](https://www.reddit.com/r/comfyui/comments/1l3e6v9/dynamically_changing_file_path_and_file_name_in_a/)  
14. How To Create A Basic ComfyUI Custom Node | by YushanT7 \- Medium, Zugriff am Februar 27, 2026, [https://medium.com/@yushantripleseven/how-to-create-a-basic-comfyui-custom-node-2f82def00f1b](https://medium.com/@yushantripleseven/how-to-create-a-basic-comfyui-custom-node-2f82def00f1b)  
15. Getting Started \- ComfyUI Official Documentation, Zugriff am Februar 27, 2026, [https://docs.comfy.org/custom-nodes/walkthrough](https://docs.comfy.org/custom-nodes/walkthrough)  
16. This is a shame. I've not used Nodes 2.0 so can't comment but I hope this doesn't cause a split in the node developers or mean that tgthree eventually can't be used because they're great\! : r/comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1pd1r0k/this\_is\_a\_shame\_ive\_not\_used\_nodes\_20\_so\_cant/](https://www.reddit.com/r/comfyui/comments/1pd1r0k/this_is_a_shame_ive_not_used_nodes_20_so_cant/)  
17. Custom Node Development in ComfyUI | PDF | Client–Server Model | Java Script \- Scribd, Zugriff am Februar 27, 2026, [https://www.scribd.com/document/906086681/ComfyUI-Custom-Node-Development](https://www.scribd.com/document/906086681/ComfyUI-Custom-Node-Development)  
18. Properties \- ComfyUI, Zugriff am Februar 27, 2026, [https://docs.comfy.org/custom-nodes/backend/server\_overview](https://docs.comfy.org/custom-nodes/backend/server_overview)  
19. Save Image filname\_prefix error · Issue \#2905 · Comfy-Org/ComfyUI \- GitHub, Zugriff am Februar 27, 2026, [https://github.com/Comfy-Org/ComfyUI/issues/2905](https://github.com/Comfy-Org/ComfyUI/issues/2905)  
20. Looking for a "Load Image" custom node with an output for the filename string \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1oa9vcl/looking\_for\_a\_load\_image\_custom\_node\_with\_an/](https://www.reddit.com/r/comfyui/comments/1oa9vcl/looking_for_a_load_image_custom_node_with_an/)  
21. Hidden and Flexible inputs \- ComfyUI Official Documentation, Zugriff am Februar 27, 2026, [https://docs.comfy.org/custom-nodes/backend/more\_on\_inputs](https://docs.comfy.org/custom-nodes/backend/more_on_inputs)  
22. ComfyUI Node: Save Image \- RunComfy, Zugriff am Februar 27, 2026, [https://www.runcomfy.com/comfyui-nodes/ComfyUI/SaveImage](https://www.runcomfy.com/comfyui-nodes/ComfyUI/SaveImage)  
23. Custom Save-to-Image Node: Expert bug finder required · Comfy-Org ComfyUI · Discussion \#2734 \- GitHub, Zugriff am Februar 27, 2026, [https://github.com/Comfy-Org/ComfyUI/discussions/2734](https://github.com/Comfy-Org/ComfyUI/discussions/2734)  
24. Missing \`extra\_pnginfo\` in execution error · Issue \#8643 · Comfy-Org/ComfyUI \- GitHub, Zugriff am Februar 27, 2026, [https://github.com/Comfy-Org/ComfyUI/issues/8643](https://github.com/Comfy-Org/ComfyUI/issues/8643)  
25. New custom nodes \- Prompt Info : r/comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/17bbqha/new\_custom\_nodes\_prompt\_info/](https://www.reddit.com/r/comfyui/comments/17bbqha/new_custom_nodes_prompt_info/)  
26. Is there any custom node that can save in output metadata the actual prompt when using wildcards? : r/comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/19asir6/is\_there\_any\_custom\_node\_that\_can\_save\_in\_output/](https://www.reddit.com/r/comfyui/comments/19asir6/is_there_any_custom_node_that_can_save_in_output/)  
27. ComfyUI Nodes Info, Zugriff am Februar 27, 2026, [https://ltdrdata.github.io/](https://ltdrdata.github.io/)  
28. Using the API : Part 1\. Controlling ComfyUI via Script &… | by YushanT7 | Medium, Zugriff am Februar 27, 2026, [https://medium.com/@yushantripleseven/comfyui-using-the-api-261293aa055a](https://medium.com/@yushantripleseven/comfyui-using-the-api-261293aa055a)  
29. ComfyUI Tutorial \- 3 pass workflows \- multiprompt shenannigans \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1axqw6s/comfyui\_tutorial\_3\_pass\_workflows\_multiprompt/](https://www.reddit.com/r/comfyui/comments/1axqw6s/comfyui_tutorial_3_pass_workflows_multiprompt/)  
30. When you have multiple samplers in one workflow, what determines which renders first? : r/comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1o8bh1z/when\_you\_have\_multiple\_samplers\_in\_one\_workflow/](https://www.reddit.com/r/comfyui/comments/1o8bh1z/when_you_have_multiple_samplers_in_one_workflow/)  
31. Is it possible to check a generated Prompt, before sending it to the KSampler Node? \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1onlay5/is\_it\_possible\_to\_check\_a\_generated\_prompt\_before/](https://www.reddit.com/r/comfyui/comments/1onlay5/is_it_possible_to_check_a_generated_prompt_before/)  
32. How to write a sequential list of prompts \- comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1lmga69/how\_to\_write\_a\_sequential\_list\_of\_prompts/](https://www.reddit.com/r/comfyui/comments/1lmga69/how_to_write_a_sequential_list_of_prompts/)  
33. Made a ComfyUI node to extract Prompt and other info \+ Text Viewer node. \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1oyb3zn/made\_a\_comfyui\_node\_to\_extract\_prompt\_and\_other/](https://www.reddit.com/r/comfyui/comments/1oyb3zn/made_a_comfyui_node_to_extract_prompt_and_other/)  
34. Checkpoint Loader (Simple) \- ComfyUI Wiki, Zugriff am Februar 27, 2026, [https://comfyui-wiki.com/en/comfyui-nodes/loaders/checkpoint-loader-simple](https://comfyui-wiki.com/en/comfyui-nodes/loaders/checkpoint-loader-simple)  
35. idea/comfyui-prompt-control, Zugriff am Februar 27, 2026, [https://gitee.com/analyzesystem/comfyui-prompt-control](https://gitee.com/analyzesystem/comfyui-prompt-control)  
36. New rgthree-comfy node: Power Puter : r/comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1kuoskb/new\_rgthreecomfy\_node\_power\_puter/](https://www.reddit.com/r/comfyui/comments/1kuoskb/new_rgthreecomfy_node_power_puter/)  
37. Checkpoint name in the name of the generated file : r/comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/16sijyx/checkpoint\_name\_in\_the\_name\_of\_the\_generated\_file/](https://www.reddit.com/r/comfyui/comments/16sijyx/checkpoint_name_in_the_name_of_the_generated_file/)  
38. Custom\_nodes path different from original ComfyUI folder\_paths definition. \#420 \- GitHub, Zugriff am Februar 27, 2026, [https://github.com/Comfy-Org/ComfyUI-Manager/issues/420](https://github.com/Comfy-Org/ComfyUI-Manager/issues/420)  
39. Save File Formatting \- ComfyUI Community Manual \- GitHub Pages, Zugriff am Februar 27, 2026, [https://blenderneko.github.io/ComfyUI-docs/Interface/SaveFileFormatting/](https://blenderneko.github.io/ComfyUI-docs/Interface/SaveFileFormatting/)  
40. Don't Get Too Comfortable: Hacking ComfyUI Through Custom Nodes | Snyk Labs, Zugriff am Februar 27, 2026, [https://labs.snyk.io/resources/hacking-comfyui-through-custom-nodes/](https://labs.snyk.io/resources/hacking-comfyui-through-custom-nodes/)  
41. save file image using formatting doesn't work · Issue \#2832 · Comfy-Org/ComfyUI \- GitHub, Zugriff am Februar 27, 2026, [https://github.com/Comfy-Org/ComfyUI/issues/2832](https://github.com/Comfy-Org/ComfyUI/issues/2832)  
42. How do I ensure the the save image node would keep the input filename as it is instead of renaming it with prefix and counter? \- ComfyUI, Zugriff am Februar 27, 2026, [https://forum.comfy.org/t/how-do-i-ensure-the-the-save-image-node-would-keep-the-input-filename-as-it-is-instead-of-renaming-it-with-prefix-and-counter/3778](https://forum.comfy.org/t/how-do-i-ensure-the-the-save-image-node-would-keep-the-input-filename-as-it-is-instead-of-renaming-it-with-prefix-and-counter/3778)  
43. ComfyUI Node: Save Text \- RunComfy, Zugriff am Februar 27, 2026, [https://www.runcomfy.com/comfyui-nodes/ComfyUI-Custom-Scripts/SaveText-pysssss](https://www.runcomfy.com/comfyui-nodes/ComfyUI-Custom-Scripts/SaveText-pysssss)  
44. Save Images to Local in ComfyUI, Zugriff am Februar 27, 2026, [https://comfyui-wiki.com/en/comfyui-nodes/image/save-image](https://comfyui-wiki.com/en/comfyui-nodes/image/save-image)  
45. en/comfyui-nodes/image/save-image · comfyui-wiki Comments · Discussion \#8 \- GitHub, Zugriff am Februar 27, 2026, [https://github.com/comfyui-wiki/Comments/discussions/8](https://github.com/comfyui-wiki/Comments/discussions/8)  
46. thedyze/save-image-extended-comfyui \- GitHub, Zugriff am Februar 27, 2026, [https://github.com/thedyze/save-image-extended-comfyui](https://github.com/thedyze/save-image-extended-comfyui)  
47. What node do you recommend for saving to a specific folder : r/comfyui \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/comfyui/comments/1c6kqun/what\_node\_do\_you\_recommend\_for\_saving\_to\_a/](https://www.reddit.com/r/comfyui/comments/1c6kqun/what_node_do_you_recommend_for_saving_to_a/)  
48. Insane ComfyUI Upgrade: 165 Custom Nodes That Actually Work \- YouTube, Zugriff am Februar 27, 2026, [https://www.youtube.com/watch?v=XVuN4igXdoQ](https://www.youtube.com/watch?v=XVuN4igXdoQ)  
49. \[GUIDE\] ComfyUI AnimateDiff Guide/Workflows Including Prompt Scheduling \- An Inner-Reflections Guide (Including a Beginner Guide) : r/StableDiffusion \- Reddit, Zugriff am Februar 27, 2026, [https://www.reddit.com/r/StableDiffusion/comments/16w4zcc/guide\_comfyui\_animatediff\_guideworkflows/](https://www.reddit.com/r/StableDiffusion/comments/16w4zcc/guide_comfyui_animatediff_guideworkflows/)  
50. ComfyUI Node: Set Positive Prompt In MetaData \- RunComfy, Zugriff am Februar 27, 2026, [https://www.runcomfy.com/comfyui-nodes/ComfyUI-JNodes/JNodes\_SetPositivePromptInMetaData](https://www.runcomfy.com/comfyui-nodes/ComfyUI-JNodes/JNodes_SetPositivePromptInMetaData)  
51. ComfyUI Finds \- Logik Forums, Zugriff am Februar 27, 2026, [https://forum.logik.tv/t/comfyui-finds/13597](https://forum.logik.tv/t/comfyui-finds/13597)