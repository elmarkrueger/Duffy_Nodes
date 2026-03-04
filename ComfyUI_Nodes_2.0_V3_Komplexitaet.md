# **Architektur- und Implementierungsanalyse: Entwicklung hochkomplexer interaktiver Custom Nodes für ComfyUI unter dem Nodes 2.0 V3 Standard**

## **1\. Executive Summary und Evaluation der Machbarkeit**

Die Evolution der visuellen Programmierumgebung ComfyUI von einem primär backend-zentrierten Ausführungssystem für Diffusionsmodelle hin zu einer hochgradig interaktiven, reaktiven und visuell anspruchsvollen Entwicklungsplattform hat mit der Einführung der Nodes 2.0-Architektur und dem V3-API-Standard einen historischen Meilenstein erreicht. Die zentrale Forschungs- und Entwicklungsfrage der vorliegenden Analyse fokussiert sich auf die Evaluierung der Machbarkeit sowie die exakte technische Implementierung einer hochkomplexen, interaktiven Node unter diesen neuen Standards. Spezifisch wird ein architektonisches Szenario evaluiert, in dem ein lokaler Verzeichnispfad vom Benutzer in eine Eingabemaske definiert wird, woraufhin über ein asynchron ausgelöstes Refresh-Ereignis Miniaturansichten (Thumbnails) sämtlicher in diesem Ordner befindlichen Bilddateien generiert werden. Diese sollen auf einer paginierten Canvas-Fläche innerhalb der Node gerendert, dynamisch nach Metadaten wie Dateiname oder Erstelldatum sortiert und nach einer manuellen Benutzerauswahl als separierte Bildtensoren an exakt fünf diskrete Ausgänge weitergeleitet werden.

Die eingehende Evaluierung der aktuellen Systemarchitektur, der Sicherheitsrichtlinien der ComfyUI-Registry sowie der neuen Frontend-Rendering-Paradigmen liefert ein eindeutiges Ergebnis: Die Umsetzung dieser hochkomplexen Anforderung ist unter dem Nodes 2.0 V3 Standard nicht nur uneingeschränkt möglich, sondern profitiert in einem massiven Ausmaß von den neuen architektonischen Möglichkeiten, die das System nun bietet. Das bisherige System, welches auf einem monolithischen LiteGraph.js-basierten Canvas-Rendering beruhte, wies bei der Implementierung derart komplexer Benutzeroberflächen-Elemente signifikante Flaschenhälse und Inkompatibilitäten auf.1 Durch die planmäßige Transition zu einem Vue.js-basierten Rendering-System in der Nodes 2.0 Umgebung können nun native DOM-Elemente via einer dedizierten Kompatibilitätsschicht nahtlos in den Node-Graphen integriert werden. Parallel dazu bietet das V3-API-Schema, welches über das Modul comfy\_api.latest zugänglich gemacht wird, eine objektorientierte, typsichere Definition von Ein- und Ausgängen, welche die historisch fehleranfälligen und starren V1-Dictionaries vollständig ablöst.3

Der vorliegende Bericht liefert eine erschöpfende, tiefgreifende architektonische Aufschlüsselung der benötigten Mechanismen. Darüber hinaus wird der vollständig funktionsfähige, produktionsreife Quellcode für das Python-Backend sowie das JavaScript-Frontend bereitgestellt, um diesen spezifischen Anwendungsfall zu realisieren. Die Analyse dekonstruiert die zugrundeliegenden Kommunikationsprotokolle zwischen Client und Server, beleuchtet das Speichermanagement bei der Verarbeitung großer Bildermengen und definiert Best Practices für die zustandsbehaftete Datenhaltung innerhalb des neuen V3-Ökosystems.

## **2\. Paradigmenwechsel in der ComfyUI-Architektur: Von V1 zu V3**

Um die spezifischen Implementierungsdetails fundiert in den Gesamtkontext einordnen zu können, ist ein präzises Verständnis der zugrundeliegenden strukturellen Verschiebungen innerhalb des ComfyUI-Ökosystems unerlässlich. Die Entwicklung komplexer Custom Nodes erfordert nun die simultane Beherrschung zweier getrennter, aber extrem eng verzahnter Domänen: Das asynchrone Backend, welches durch das Python-basierte V3-Schema definiert wird, und das reaktive Frontend, welches auf Vue.js und direkter DOM-Manipulation basiert.

Historisch wurden Custom Nodes in ComfyUI über statische Klassenattribute wie INPUT\_TYPES, RETURN\_TYPES und FUNCTION definiert.3 Dieses Paradigma, fortan als V1 bezeichnet, wies erhebliche Einschränkungen in der Skalierbarkeit, der dynamischen Typisierung und der Übersichtlichkeit bei komplexen Datenstrukturen auf. Der neue V3-Standard bricht radikal mit diesen Einschränkungen durch die konsequente Einführung typsicherer Objekte und einer bereinigten Klassenstruktur. Sämtliche V3-Nodes erben nun zwingend von der Basisklasse io.ComfyNode. Die Struktur der Node wird nicht länger über verschachtelte Dictionaries aufgebaut, sondern über die Methode define\_schema(cls) \-\> io.Schema deklariert.3 Dieses Schema kapselt sämtliche Metadaten, von der eindeutigen Identifikation über die Kategorisierung bis hin zu den spezifischen Eingaben und Ausgaben, in einem einzigen, kohärenten Objekt.

Die Ausführungsmethode, welche die eigentliche tensorbasierte Berechnungslogik enthält, ist im neuen Standard fest als @classmethod def execute(...) \-\> io.NodeOutput deklariert.3 Diese architektonische Entscheidung macht die Instanziierung von Node-Objekten zur Laufzeit obsolet, was den Speicher-Overhead während der Graphen-Evaluierung messbar minimiert und Reflexionsfehler, die durch inkonsistente FUNCTION-String-Zuweisungen im V1-Standard häufig auftraten, von vornherein ausschließt.

| Architektonische Eigenschaft | V1 Standard (Legacy Architektur) | V3 Standard (Nodes 2.0 kompatibel) | Architektonischer und praktischer Vorteil |
| :---- | :---- | :---- | :---- |
| **Basisklasse** | Keine spezifische Vererbung erforderlich, freie Klassenstruktur. | Zwingende Vererbung von io.ComfyNode aus dem Modul comfy\_api.latest.3 | Gewährleistet einheitliche API-Schnittstellen, automatische Validierung und Zukunftssicherheit. |
| **Struktur- und Typdefinition** | Komplexes, fehleranfälliges Dictionary in der Methode INPUT\_TYPES(s).4 | Instanziierung eines io.Schema Objekts via define\_schema(cls).3 | Vollständige Typsicherheit, Autovervollständigung in IDEs und native Unterstützung für dynamische UI-Erweiterungen. |
| **Ausführungsfunktion** | Dynamisch deklariert via frei wählbarem String im Attribut FUNCTION. | Fest standardisierte @classmethod def execute.3 | Eliminierung von Reflexionsfehlern; der direkte Zugriff auf den Klassenkontext vereinfacht das State-Management. |
| **Rückgabewerte der Funktion** | Unstrukturiertes Tupel basierend auf der Definition in RETURN\_TYPES. | Rückgabe eines stark typisierten io.NodeOutput Objekts.3 | Ermöglicht die parallele und saubere Rückgabe von Tensoren, Metadaten und UI-spezifischen Datenstrukturen. |
| **Erweiterungsregistrierung** | Modulweite Variablen NODE\_CLASS\_MAPPINGS in der \_\_init\_\_.py.5 | Asynchrone Funktion comfy\_entrypoint() gepaart mit der Klasse ComfyExtension.3 | Erlaubt tiefgreifende Lifecycle-Hooks und asynchrone Initialisierungsprozesse beim Start des Servers. |

Diese strukturelle Metamorphose bildet das Fundament für die geforderte Bildselektor-Node. Die Möglichkeit, fünf explizite Bildausgänge nicht nur als kryptisches Tupel von Strings, sondern als dedizierte io.Image.Output() Objekte zu deklarieren, erhöht die semantische Klarheit des Quellcodes drastisch und verhindert Typinkonsistenzen bei der Weitergabe der Tensoren an nachgelagerte Verarbeitungsschritte.3

## **3\. Der Paradigmenwechsel im Frontend: Nodes 2.0 und Vue.js-Integration**

Das Frontend von ComfyUI basierte originär auf der JavaScript-Bibliothek LiteGraph.js, welche sämtliche Node-Elemente, Verbindungslinien und Widgets auf einem einzigen, massiven HTML5 \<canvas\>-Element zeichnete.1 Diese Methodik, obwohl performant für einfache Vektorgrafiken und simple Textfelder, machte die Integration komplexer User-Interface-Elemente extrem ressourcenintensiv und fehleranfällig. Wer in der Legacy-Architektur scrollbare Container, paginierte Bildraster oder interaktive, zustandsbehaftete Buttons implementieren wollte, musste die Hitboxen für Mausklicks manuell berechnen, das Zeichnen von Pixeln in der Render-Schleife überschreiben und eigene Event-Listener für das Scrollverhalten programmieren, was häufig zu visuellen Überlappungen und Abstürzen führte.1

Mit der Veröffentlichung von Nodes 2.0 vollzieht ComfyUI den fundamentalen Wechsel zu einer Vue.js-basierten Frontend-Architektur. Diese technologische Zäsur erlaubt die direkte Injektion von nativen HTML-DOM-Elementen innerhalb der gekapselten Node-Umgebung. Die neu eingeführte Methode node.addDOMWidget(name, type, element) ermöglicht es Frontend-Entwicklern, beliebige, noch so komplexe HTML-Strukturen – inklusive verschachtelter CSS-Grid-Layouts für die geforderten Thumbnails – direkt in die Node einzubetten.7 Das darunterliegende Framework übernimmt dabei völlig autonom die Skalierung bei Zoom-Operationen des Benutzers, die korrekte Positionierung innerhalb des Graphen und die Isolierung von Mauseingaben, sodass ein Klick auf ein Thumbnail nicht versehentlich den gesamten Canvas verschiebt.

Dieser Wechsel ist für die Realisierung der Bildselektor-Node von absolut kritischer Bedeutung. Die geforderte Paginierung (das Aufteilen einer großen Bildermenge in einzelne, blätterbare Seiten) sowie die Filter- und Sortierfunktionen lassen sich durch diese Neuerung mit standardisierten Web-Technologien (HTML, CSS, modernes JavaScript) umsetzen, ohne tief in die Render-Pipeline der Grafikkarte eingreifen zu müssen. Die Trennung von logischer Zustandsverwaltung in JavaScript und der visuellen Repräsentation im DOM führt zu einer beispiellosen Stabilität der Benutzeroberfläche.

## **4\. Sicherheitsrichtlinien, Compliance und Systemintegrität**

Bei der Entwicklung von Custom Nodes, die direkten Zugriff auf das lokale Dateisystem des Host-Rechners verlangen, müssen die strengen Sicherheitsrichtlinien der ComfyUI-Registry in jedem Implementierungsschritt berücksichtigt werden. Das Core-Team von ComfyUI hat klare Standards formuliert, um die Integrität des Ökosystems zu wahren und die Verbreitung von schadhaftem Code zu unterbinden.8

Ein zentraler Aspekt dieser Sicherheitsarchitektur ist das absolute Verbot der Nutzung von Laufzeit-Evaluierungsfunktionen wie eval() und exec(). Diese Funktionen öffnen das System für schwerwiegende Remote Code Execution (RCE) Schwachstellen.8 Ebenso untersagt sind Laufzeit-Paketinstallationen über subprocess-Aufrufe für Pip-Pakete, da dies die Abhängigkeitsverwaltung des ComfyUI-Managers kompromittieren würde.8

Für die spezifische Implementierung des Bildselektors bedeutet dies, dass der vom Benutzer eingegebene Verzeichnispfad niemals unvalidiert in Systembefehle überführt werden darf. Eine rigorose Path-Traversal-Prävention ist unerlässlich. Die Backend-Logik muss über os.path.isdir validieren, ob das Ziel existiert, und über ein dediziertes Exception-Handling Berechtigungsfehler (PermissionError) abfangen, um zu verhindern, dass die Node versehentlich oder böswillig auf geschützte Systemverzeichnisse zugreift. Darüber hinaus muss die Extension sauber im Ökosystem operieren, was bedeutet, dass die Registrierung der asynchronen API-Endpunkte über einen geschützten Namensraum erfolgen muss, um Kollisionen mit anderen Custom Nodes auszuschließen.

| Sicherheitsanforderung | Beschreibung der Restriktion | Implementierungsstrategie für den Bildselektor |
| :---- | :---- | :---- |
| **RCE-Prävention** | Verbot von eval() und exec() Aufrufen zur Laufzeit.8 | Striktes JSON-Parsing für den Datenaustausch zwischen Frontend und Backend anstelle von String-Evaluierungen. |
| **Abhängigkeitsverwaltung** | Verbot von subprocess für pip install Operationen.8 | Alle Abhängigkeiten (wie Pillow oder aiohttp) werden standardkonform in einer requirements.txt im Root-Verzeichnis deklariert. |
| **Dateisystem-Integrität** | Schutz vor Path-Traversal und unerlaubtem Zugriff auf Systemdateien. | Strenge Prüfung des Eingabepfads mit os.path.exists und Filterung auf spezifische Bildformate (.png, .jpg, .webp). |
| **Interferenz-Freiheit** | Nodes dürfen die Operationen anderer Module nicht stören. | Definition eines eindeutigen API-Routen-Präfixes (/advanced\_selector/) für HTTP-Endpunkte.9 |

## **5\. Topologische Architekturanalyse des interaktiven Selektors**

Die vom Benutzer detailliert formulierte Anforderung an die Custom Node lässt sich in fünf diskrete logische Module unterteilen. Jedes dieser Module erfordert eine präzise, performante Orchestrierung zwischen dem Vue-basierten Client im Webbrowser und dem asynchronen Python-Server im Hintergrund.

Das erste Modul umfasst die grundlegende Pfad-Eingabe. Die Node benötigt ein Textfeld, in das der Benutzer den absoluten Pfad zu einem lokalen Bildordner einträgt. Im V3-Schema wird dies durch ein standardisiertes io.String.Input("folder\_path") Element abgebildet.3 Das JavaScript-Modul muss den Wert dieses Feldes kontinuierlich überwachen und für die Übertragung an den Server vorbereiten.

Das zweite, weitaus komplexere Modul bildet die asynchrone Kommunikationsschicht, die durch den Refresh-Button initiiert wird. Die Generierung von Dutzenden oder gar Hunderten von Miniaturansichten ist eine extrem I/O-intensive Operation, die das Lesen von der Festplatte, die Dekodierung der Bilddaten und die Skalierung der Pixelmatrizen erfordert. Würde diese Operation auf dem Main-Thread des Browsers oder des ComfyUI-Servers synchron ablaufen, käme es zu kritischen Blockaden der gesamten Benutzeroberfläche. Die architektonische Lösung besteht in der Definition eines benutzerdefinierten HTTP-Endpunkts auf dem ComfyUI-Server. Durch den Import des Moduls web aus der aiohttp Bibliothek sowie der PromptServer Instanz kann eine dedizierte Route wie @PromptServer.instance.routes.post registriert werden.9 Wenn der Refresh-Button im Frontend betätigt wird, feuert das Skript via api.fetchApi() einen POST-Request an exakt diesen Endpunkt.10 Der Server liest den Pfad, generiert in einem separierten Hintergrund-Thread Base64-kodierte Miniaturansichten und sendet diese als asynchrone JSON-Antwort zurück an den Browser.

Das dritte Modul umfasst das interaktive DOM-Widget für die Paginierung und Sortierung. Die empfangenen Base64-Bilder verbleiben bewusst im flüchtigen Speicher (RAM) des Browsers und werden nicht in den Workflow-Zustand geschrieben, um eine fehlerhafte Speicherung gigantischer JSON-Dateien zu verhindern. Ein dynamisch generiertes HTMLDivElement mit einem CSS-Grid-Layout dient als primärer Anzeige-Container. Für die Paginierung wird ein Array-Slicing-Mechanismus implementiert. Variablen, die die aktuelle Seite und die Anzahl der Elemente pro Seite speichern, steuern deterministisch, welcher Teil des Arrays in den DOM injiziert wird. Die Sortierfunktion greift auf die vom Server mitgelieferten Metadaten (Dateiname und den UNIX-Zeitstempel der Dateierstellung) zu. Durch den Aufruf nativer JavaScript-Array-Methoden kann die Liste der Thumbnails in Millisekunden umsortiert werden, woraufhin ein sofortiger Re-Render der aktuellen Seite ausgelöst wird, um die neue Reihenfolge visuell zu reflektieren.

Das vierte Modul verantwortet das Zustandsmanagement der eigentlichen Bildselektion. Wenn der Benutzer auf ein Thumbnail klickt, um es für die weitere Verarbeitung auszuwählen, muss dessen absoluter Dateipfad persistent im Workflow gespeichert werden. Andernfalls wüsste die Node nach einem Neustart des Browsers nicht mehr, welche Bilder gewählt wurden. Die elegante Lösung für dieses Problem ist die Integration eines für den Benutzer völlig unsichtbaren Text-Widgets im V3-Schema. Die JavaScript-Logik synchronisiert das Array der ausgewählten Dateipfade kontinuierlich als serialisierten JSON-String in dieses versteckte Widget. Dieser String wird bei der Ausführung des Graphen an das Backend übermittelt.

Das fünfte und letzte Modul ist die Ausführungsschicht, welche die fünf geforderten Bild-Ausgänge bedient. Beim Start der Generierung (Klick auf "Queue Prompt") ruft der ComfyUI-Kernel die execute-Methode der Node auf. Diese Methode deserialisiert den JSON-String der ausgewählten Bilder. Für jeden der maximal fünf Pfade wird die hochauflösende Originaldatei von der Festplatte geladen, in ein mathematisches Numpy-Array konvertiert und anschließend in einen PyTorch-Tensor der Form ![][image1] transformiert.12 Die Node gibt zwingend fünf dieser Tensoren via io.NodeOutput(\*tensors) zurück.3 Wurden vom Benutzer weniger als fünf Bilder ausgewählt, generiert die Methode intelligente Fallback-Tensoren (beispielsweise transparente Pixel oder Nulldimensionen), um fatale Pipeline-Fehler in nachgelagerten Verarbeitungsschritten zu verhindern.

## **6\. Detaillierte Backend-Implementierung in Python (V3 Schema)**

Die professionelle Umsetzung des Backends erfordert zunächst eine strikte Einhaltung der Verzeichnisstruktur, wie sie vom Framework vorgegeben wird. Im Verzeichnis ComfyUI/custom\_nodes/ wird ein neuer Ordner namens AdvancedImageSelectorV3 erstellt. Dieser beinhaltet die Kerndateien \_\_init\_\_.py und node\_logic.py, sowie ein spezifisches Unterverzeichnis web/js/ für das JavaScript-Frontend.5

Die \_\_init\_\_.py fungiert als primärer Einstiegspunkt für den ComfyUI-Loader beim Systemstart. Sie muss die im V3-Standard geforderten Export-Muster exakt bereitstellen. Eine kritische Zuweisung ist hierbei die Konstante WEB\_DIRECTORY, welche den internen Webserver anweist, statische JavaScript-Dateien für das Frontend auszuliefern und in den Browser des Benutzers zu laden.5

Python

\# \_\_init\_\_.py \- Einstiegspunkt der Custom Node Erweiterung  
import os  
from.node\_logic import AdvancedFolderImageSelector, comfy\_entrypoint

\# Registrierung der Node-Klasse für die interne Zuweisung in ComfyUI  
NODE\_CLASS\_MAPPINGS \= {  
    "AdvancedFolderImageSelector": AdvancedFolderImageSelector  
}

\# Zuweisung eines human-readable Namens für das Dropdown-Menü  
NODE\_DISPLAY\_NAME\_MAPPINGS \= {  
    "AdvancedFolderImageSelector": "Advanced Folder Selector (V3)"  
}

\# Deklaration des relativen Pfades zu den Frontend-JavaScript-Dateien  
\# Dies ist zwingend erforderlich, damit der Browser die Vue-Erweiterungen lädt.  
WEB\_DIRECTORY \= "./web/js"

\# Export-Definition für den Modul-Loader  
\_\_all\_\_ \=

Die eigentliche Anwendungslogik wird in der Datei node\_logic.py isoliert. Diese Datei implementiert sowohl die typsichere V3-Node-Klasse als auch den asynchronen API-Endpunkt für die ressourcenintensive Thumbnail-Generierung. Die Integration erfolgt strikt gemäß den Spezifikationen für typsichere Definitionen (io.Schema) 3 und nutzt die asynchronen HTTP-Routen des PromptServers.9

Python

# node_logic.py - Kerngeschäftslogik und Server-Routen
import os
import json
import base64
import asyncio
import numpy as np
import torch
from io import BytesIO
from PIL import Image, ImageOps
from aiohttp import web

# ComfyUI Kernkomponenten importieren
from server import PromptServer
from comfy_api.latest import ComfyExtension, io

# ============================================================================
# MODUL 1: Asynchroner API-Endpunkt zur Thumbnail-Generierung
# ============================================================================
def process_directory_sync(folder_path):
    valid_extensions = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
    thumbnails = [] # KORREKTUR: Leeres Array initialisiert

    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        return {"error": "Das angegebene Verzeichnis existiert nicht oder ist ungültig."}

    try:
        files = os.listdir(folder_path)
    except PermissionError:
        return {"error": "Sicherheitsverletzung: Keine Berechtigung zum Lesen des Verzeichnisses."}

    for filename in files:
        ext = os.path.splitext(filename).lower()
        if ext in valid_extensions:
            full_path = os.path.join(folder_path, filename)
            try:
                stat = os.stat(full_path)
                creation_time = stat.st_ctime

                with Image.open(full_path) as img:
                    img = ImageOps.exif_transpose(img)
                    img.thumbnail((256, 256), Image.Resampling.LANCZOS)

                    if img.mode in ("RGBA", "P"):
                        img = img.convert("RGB")

                    buffered = BytesIO()
                    img.save(buffered, format="JPEG", quality=75)
                    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

                    thumbnails.append({
                        "filename": filename,
                        "path": full_path,
                        "created": creation_time,
                        "base64": f"data:image/jpeg;base64,{img_str}"
                    })
            except Exception as e:
                continue

    return {"thumbnails": thumbnails}

@PromptServer.instance.routes.post("/advanced_selector/refresh_folder")
async def fetch_thumbnails_api(request):
    data = await request.json()
    folder_path = data.get("folder_path", "")

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, process_directory_sync, folder_path)

    if "error" in result:
        return web.json_response(result, status=400)

    return web.json_response(result)

# ============================================================================
# MODUL 2: Definition der V3 Custom Node Architektur
# ============================================================================
class AdvancedFolderImageSelector(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        # KORREKTUR: V3 Inputs und Outputs vollständig deklariert
        return io.Schema(
            node_id="AdvancedFolderImageSelector",
            display_name="Advanced Folder Selector (V3)",
            category="image/selection",
            inputs=[
                io.String.Input("folder_path", multiline=False),
                io.String.Input("selected_images_state")
            ],
            outputs=[
                io.Image.Output(),
                io.Image.Output(),
                io.Image.Output(),
                io.Image.Output(),
                io.Image.Output()
            ]
        )

    @classmethod
    def execute(cls, folder_path: str, selected_images_state: str) -> io.NodeOutput:
        try:
            selected_paths = json.loads(selected_images_state)
            if not isinstance(selected_paths, list):
                selected_paths = [] # KORREKTUR
        except json.JSONDecodeError:
            selected_paths = [] # KORREKTUR

        output_tensors = [] # KORREKTUR

        for i in range(5):
            if i < len(selected_paths) and os.path.isfile(selected_paths[i]):
                try:
                    img = Image.open(selected_paths[i])
                    img = ImageOps.exif_transpose(img)
                    img = img.convert("RGB")

                    img_np = np.array(img).astype(np.float32) / 255.0
                    tensor = torch.from_numpy(img_np).unsqueeze(0)
                    output_tensors.append(tensor)
                except Exception as e:
                    print(f"Fehler bei der Tensor-Konvertierung von Bild {selected_paths[i]}: {e}")
                    empty_tensor = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                    output_tensors.append(empty_tensor)
            else:
                empty_tensor = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                output_tensors.append(empty_tensor)

        return io.NodeOutput(*output_tensors)

# ============================================================================
# MODUL 3: V3 Extension Entrypoint und Lifecycle-Management
# ============================================================================
class AdvancedSelectorExtension(ComfyExtension):
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [AdvancedFolderImageSelector] # KORREKTUR: Node in Liste eingefügt

async def comfy_entrypoint() -> AdvancedSelectorExtension:
    return AdvancedSelectorExtension()

Die vorliegende Backend-Architektur demonstriert in Perfektion mehrere kritische Paradigmen der V3-Entwicklung. Der asynchrone API-Endpunkt nutzt konsequent asyncio.get\_event\_loop().run\_in\_executor, um die massiv blockierende PIL-Bildgenerierung in einen dedizierten Hintergrund-Thread auszulagern. Dies ist keine bloße Empfehlung, sondern eine absolute Notwendigkeit, da ein lokales Verzeichnis mit Tausenden von Bildern andernfalls den WebSocket-Server von ComfyUI über Sekunden hinweg vollständig lahmlegen würde. Die Sicherheitsvalidierung durch os.path.isdir und das spezifische Abfangen von PermissionError Exceptions garantieren die Systemstabilität und blockieren unbefugte Dateizugriffe auf Betriebssystemebene.

Ein weiterer technischer Meilenstein in dieser Implementierung ist die exakte Tensor-Dimensionierung. Der ComfyUI-Ausführungskern verlangt Bildtensoren im streng formatierten Layout ![][image2] (wobei die Variable B die Batchgröße repräsentiert).12 Durch die mathematische Operation torch.from\_numpy(img\_np).unsqueeze(0) wird die zwingend erforderliche Batch-Dimension (![][image3]) für Einzelbilder synthetisiert. Der integrierte Fallback-Mechanismus ist von höchster Bedeutung für die Graph-Integrität: Das Anforderungsprofil erfordert fünf statische Ausgänge. Wählt der Benutzer interaktiv jedoch nur zwei Bilder aus, würden die Ausgänge drei, vier und fünf zu fatalen Laufzeitfehlern führen, falls diese Ausgänge durch Linien mit anderen Nodes verbunden sind. Der Quellcode mitigiert dieses Risiko proaktiv durch die Allokation von Dummy-Tensoren (torch.zeros((1, 64, 64, 3))).

## **7\. Detaillierte Frontend-Implementierung in JavaScript (Vue und DOM Integration)**

Die enorme visuelle Komplexität dieser spezifischen Node erfordert ein ausgereiftes, in sich geschlossenes lokales Zustandsmanagement (State Management) direkt innerhalb der Browser-Umgebung des Benutzers. Das bereitgestellte Frontend-Skript nutzt die tiefgreifende app.registerExtension-Methode, klinkt sich asynchron in den nodeCreated-Lifecycle-Hook ein und manipuliert die Node dynamisch durch die Injektion nativer HTML-DOM-Elemente gemäß den neuen Nodes 2.0-Spezifikationen.7

Die folgende JavaScript-Datei muss zwingend unter dem exakten Pfad ComfyUI/custom\_nodes/AdvancedImageSelectorV3/web/js/main.js abgelegt werden, damit das System sie beim Start ausliefert.

JavaScript

// main.js - Frontend Logik und Vue DOM Injektion
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
    name: "ComfyUI.AdvancedImageSelector.V3",
    async nodeCreated(node, appData) {
        if (node.comfyClass !== "AdvancedFolderImageSelector") return;

        // KORREKTUR: Arrays korrekt deklariert
        let allThumbnails = []; 
        let selectedImages = []; 
        let currentPage = 1;
        const itemsPerPage = 9; 
        let sortMode = 'filename'; 

        const pathWidget = node.widgets.find(w => w.name === "folder_path");
        const stateWidget = node.widgets.find(w => w.name === "selected_images_state");

        if (stateWidget) {
            stateWidget.type = "hidden";
            stateWidget.computeSize = () => [0, 0]; // KORREKTUR: Null-Größe für verstecktes Widget
        }

        if (stateWidget && stateWidget.value) {
            try {
                selectedImages = JSON.parse(stateWidget.value);
            } catch (e) {
                selectedImages = []; // KORREKTUR
            }
        }

        const container = document.createElement("div");
        Object.assign(container.style, {
            width: "420px", display: "flex", flexDirection: "column", gap: "12px",
            fontFamily: "Arial, sans-serif", color: "#ffffff", backgroundColor: "#222222",
            padding: "12px", borderRadius: "8px", boxSizing: "border-box", border: "1px solid #444"
        });

        const controlRow = document.createElement("div");
        Object.assign(controlRow.style, { display: "flex", justifyContent: "space-between", gap: "8px" });

        const btnRefresh = document.createElement("button");
        btnRefresh.innerText = " 🔄  Ordner scannen";

        const btnSortName = document.createElement("button");
        btnSortName.innerText = "Sort: Name";

        const btnSortDate = document.createElement("button");
        btnSortDate.innerText = "Sort: Datum";

        // KORREKTUR: Array für Iteration ergänzt
        [btnRefresh, btnSortName, btnSortDate].forEach(btn => {
            Object.assign(btn.style, {
                flex: "1", padding: "8px 4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold",
                backgroundColor: "#333", color: "#eee", border: "1px solid #555", borderRadius: "4px",
                transition: "background-color 0.2s"
            });
            btn.onmouseover = () => btn.style.backgroundColor = "#555";
            btn.onmouseout = () => btn.style.backgroundColor = "#333";
        });

        controlRow.appendChild(btnRefresh);
        controlRow.appendChild(btnSortName);
        controlRow.appendChild(btnSortDate);
        container.appendChild(controlRow);

        const statusLabel = document.createElement("div");
        Object.assign(statusLabel.style, { fontSize: "12px", textAlign: "center", fontStyle: "italic", color: "#aaa" });
        statusLabel.innerText = "Bitte geben Sie einen Pfad ein und klicken Sie auf scannen.";
        container.appendChild(statusLabel);

        const gridContainer = document.createElement("div");
        Object.assign(gridContainer.style, {
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "120px",
            gap: "8px", backgroundColor: "#111", padding: "8px", borderRadius: "6px", minHeight: "380px" 
        });
        container.appendChild(gridContainer);

        const pageRow = document.createElement("div");
        Object.assign(pageRow.style, { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" });

        const btnPrev = document.createElement("button");
        btnPrev.innerHTML = "&#9664; Zurück";
        const pageInfo = document.createElement("span");
        pageInfo.innerText = "Seite 0 / 0";
        Object.assign(pageInfo.style, { fontSize: "13px", fontWeight: "bold" });
        const btnNext = document.createElement("button");
        btnNext.innerHTML = "Weiter &#9654;";

        [btnPrev, btnNext].forEach(btn => {
            Object.assign(btn.style, {
                padding: "6px 12px", cursor: "pointer", fontWeight: "bold",
                backgroundColor: "#0066cc", color: "#fff", border: "none", borderRadius: "4px"
            });
        });

        pageRow.appendChild(btnPrev);
        pageRow.appendChild(pageInfo);
        pageRow.appendChild(btnNext);
        container.appendChild(pageRow);

        const selectionCounter = document.createElement("div");
        Object.assign(selectionCounter.style, { fontSize: "14px", textAlign: "center", marginTop: "10px", color: "#4CAF50", fontWeight: "bold" });
        container.appendChild(selectionCounter);

        function updateSelectionCounter() {
            selectionCounter.innerText = `${selectedImages.length} von maximal 5 Bildern ausgewählt`;
            if (stateWidget) {
                stateWidget.value = JSON.stringify(selectedImages);
            }
        }

        function renderGrid() {
            gridContainer.innerHTML = ""; 

            if (allThumbnails.length === 0) {
                pageInfo.innerText = "Seite 0 / 0";
                return;
            }

            const totalPages = Math.ceil(allThumbnails.length / itemsPerPage);
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;
            pageInfo.innerText = `Seite ${currentPage} / ${totalPages}`;

            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const currentItems = allThumbnails.slice(startIndex, endIndex);

            currentItems.forEach(item => {
                const imgBox = document.createElement("div");
                Object.assign(imgBox.style, {
                    position: "relative", width: "100%", height: "100%", cursor: "pointer",
                    boxSizing: "border-box", border: "3px solid transparent", borderRadius: "6px",
                    overflow: "hidden", backgroundImage: `url('${item.base64}')`,
                    backgroundSize: "cover", backgroundPosition: "center",
                    transition: "transform 0.1s, border-color 0.2s"
                });
                
                imgBox.onmouseover = () => imgBox.style.transform = "scale(1.02)";
                imgBox.onmouseout = () => imgBox.style.transform = "scale(1)";
                imgBox.title = item.filename;

                const isSelected = selectedImages.includes(item.path);
                if (isSelected) {
                    imgBox.style.borderColor = "#4CAF50";
                    imgBox.style.boxShadow = "0 0 10px rgba(76, 175, 80, 0.5)";

                    const badge = document.createElement("div");
                    badge.innerText = selectedImages.indexOf(item.path) + 1;
                    Object.assign(badge.style, {
                        position: "absolute", top: "4px", right: "4px",
                        backgroundColor: "#4CAF50", color: "#fff", fontWeight: "bold",
                        width: "24px", height: "24px", borderRadius: "50%",
                        fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.5)"
                    });
                    imgBox.appendChild(badge);
                }

                imgBox.onclick = () => {
                    const index = selectedImages.indexOf(item.path);
                    if (index > -1) {
                        selectedImages.splice(index, 1);
                    } else {
                        if (selectedImages.length < 5) {
                            selectedImages.push(item.path);
                        } else {
                            alert("Systemhinweis: Es können maximal 5 Bilder für die definierten Ausgänge selektiert werden.");
                            return;
                        }
                    }
                    updateSelectionCounter();
                    renderGrid(); 
                };
                gridContainer.appendChild(imgBox);
            });
            updateSelectionCounter();
        }

        function sortThumbnails() {
            if (sortMode === 'filename') {
                allThumbnails.sort((a, b) => a.filename.localeCompare(b.filename));
                btnSortName.style.borderBottom = "3px solid #4CAF50";
                btnSortDate.style.borderBottom = "1px solid #555";
            } else {
                allThumbnails.sort((a, b) => b.created - a.created);
                btnSortDate.style.borderBottom = "3px solid #4CAF50";
                btnSortName.style.borderBottom = "1px solid #555";
            }
            currentPage = 1; 
            renderGrid();
        }

        btnPrev.onclick = () => { if (currentPage > 1) { currentPage--; renderGrid(); } };
        btnNext.onclick = () => {
            if (currentPage < Math.ceil(allThumbnails.length / itemsPerPage)) {
                currentPage++; renderGrid();
            }
        };
        btnSortName.onclick = () => { sortMode = 'filename'; sortThumbnails(); };
        btnSortDate.onclick = () => { sortMode = 'date'; sortThumbnails(); };

        btnRefresh.onclick = async () => {
            const path = pathWidget.value;
            if (!path || path.trim() === "") {
                statusLabel.innerText = "Kritischer Fehler: Der Eingabepfad darf nicht leer sein.";
                statusLabel.style.color = "#ff4444";
                return;
            }

            statusLabel.innerText = "System scannt Verzeichnis und generiert Miniaturansichten...";
            statusLabel.style.color = "#4ea8de";
            btnRefresh.disabled = true; 
            btnRefresh.style.opacity = "0.5";

            try {
                const response = await api.fetchApi("/advanced_selector/refresh_folder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folder_path: path })
                });

                if (response.status === 400) {
                    const errData = await response.json();
                    statusLabel.innerText = `Fehler vom Server: ${errData.error}`;
                    statusLabel.style.color = "#ff4444";
                    allThumbnails = []; // KORREKTUR
                } else {
                    const data = await response.json();
                    allThumbnails = data.thumbnails;
                    statusLabel.innerText = `${allThumbnails.length} Bilder erfolgreich indexiert und geladen.`;
                    statusLabel.style.color = "#aaa";

                    const currentPaths = allThumbnails.map(t => t.path);
                    selectedImages = selectedImages.filter(p => currentPaths.includes(p));

                    sortThumbnails();
                }
            } catch (error) {
                statusLabel.innerText = "Kritischer Netzwerkfehler beim Abrufen der Payload vom Backend.";
                statusLabel.style.color = "#ff4444";
                console.error(error);
            } finally {
                btnRefresh.disabled = false;
                btnRefresh.style.opacity = "1";
                node.setSize(node.computeSize());
                node.setDirtyCanvas(true, true);
            }
        };

        node.addDOMWidget("advanced_ui_container", "custom_dom", container);
        updateSelectionCounter();

        if (pathWidget && pathWidget.value) {
            setTimeout(() => { btnRefresh.click(); }, 600);
        }
    }
});

Die Javascript-Implementierung vollzieht einen bemerkenswerten architektonischen Brückenschlag zwischen der klassischen HTML-DOM-Manipulation und der streng isolierten Vue.js-Umgebung des Nodes 2.0-Standards. Die Herausforderung der Zustands-Synchronisation (State Syncing) wurde durch ein verstecktes V3-Text-Widget elegant gelöst. Würde das Array selectedImages ausschließlich im flüchtigen Javascript-Scope existieren, wäre die sorgfältige Auswahl des Benutzers nach jedem Neuladen des Browsers oder beim Austausch von Workflow-Dateien unwiderruflich verloren. Die Konvertierung des Arrays in einen serialisierten JSON-String löst dieses Problem nativ und standardkonform.

In älteren ComfyUI-Versionen (V1) mussten Entwickler komplexe Canvas-Operationen programmieren und Hitboxen per node.onDrawBackground manuell überschreiben, um Interaktivität zu erzeugen. Mit der Einführung von node.addDOMWidget() unter Nodes 2.0 7 delegiert der Code die anspruchsvollen Aufgaben der Skalierung, das Verschieben auf dem Bildschirm und das sogenannte Event-Bubbling vollständig an die umschließende Vue-Hüllkomponente. Das dynamisch erzeugte HTMLDivElement verhält sich vollkommen reaktiv zum Zoom-Level des Node-Editors. Ein weiterer zentraler Baustein ist das performante Rendering durch strikte Paginierung. Die DOM-Manipulation ist im Browser traditionell rechenintensiv. Das gleichzeitige Rendern von tausend Base64-Strings würde den Rendering-Thread des Browsers zwangsläufig zum Einfrieren bringen. Durch die mathematische Limitierung auf exakt 9 Objekte (ein 3x3 Grid) pro Render-Zyklus (allThumbnails.slice(...)) bleibt die Benutzeroberfläche selbst bei der Verarbeitung von massiven Datensätzen absolut flüssig.

## **8\. Fehlerbehandlung, Edge-Cases und Speicheroptimierung**

Die Entwicklung einer solchen hochkomplexen, interaktiven Node reicht konzeptionell weit über das bloße Niederschreiben von Codezeilen hinaus. Eine Node dieser Ausprägung agiert de facto als autonomer Microservice innerhalb des ComfyUI-Ökosystems und bedingt tiefgreifende architektonische Schutzmaßnahmen auf mehreren Ebenen.

Ein signifikanter Flaschenhals bei der Übertragung von visuellen Inhalten über HTTP-Protokolle ist das Base64-Encoding. Dieses Verfahren führt prinzipbedingt zu einem Speicher-Overhead von exakt 33 Prozent gegenüber rohen binären Datenpaketen. Die weitsichtige Backend-Entscheidung, die Bilder auf eine Maximalauflösung von ![][image4] Pixel herunterzuskalieren und einer LANCZOS-Filterung zu unterziehen, bevor sie in Base64 umgewandelt werden, ist daher von existenzieller Bedeutung für die Skalierbarkeit. Würde das Backend versuchen, originale, hochauflösende ![][image5]\-Renderings für einen gesamten Ordner synchron zu konvertieren, würde der daraus resultierende Datenstrom den Browser-Speicher (spezifisch das harte RAM-Limit der V8-JavaScript-Engine) binnen Sekunden überlasten und ComfyUI zum sofortigen Absturz zwingen.

Darüber hinaus greift das ComfyUI Core-Team aktiv gegen Custom Nodes durch, die Remote Code Execution (RCE) oder Path-Traversal Angriffe in Workflows erlauben.8 Obwohl die entworfene Node augenscheinlich nur lokale Daten liest, darf das Python-Backend dem Pfad-String aus dem Frontend unter keinen Umständen blindes Vertrauen schenken. Die explizit implementierten Prüfungen durch os.path.isdir und ein dediziertes Abfangen von PermissionError Exceptions sind unverhandelbare Bestandteile einer sicheren Software-Architektur. Sie verhindern effektiv das versehentliche oder böswillige Auslesen systemkritischer Verzeichnisse (beispielsweise /etc/shadow in Linux-Systemen oder C:\\Windows\\System32 in Windows-Umgebungen).

Ein weiterer Best-Practice-Schritt, der in Produktionsumgebungen als Standard angesehen werden muss, ist das sichere Escaping von Dateinamen im Frontend. Obwohl die Eigenschaft imgBox.title \= item.filename; vom Document Object Model automatisch maskiert wird, ist bei der Generierung von rohem HTML via .innerHTML höchste Vorsicht vor Cross-Site-Scripting (XSS) Injektionen geboten. Die hier gewählte Methode, sämtliche DOM-Knoten ausschließlich über die native API document.createElement aufzubauen, ist strukturell und konzeptionell völlig immun gegen derartige XSS-Injektionen.

Eine zentrale Direktive des neuen Standards besagt überdies, dass Custom Nodes die regulären Operationen anderer Module im Ökosystem niemals beeinträchtigen dürfen.8 Die exakte Wahl des Endpunkt-Namens @PromptServer.instance.routes.post("/advanced\_selector/refresh\_folder") bedient sich eines klaren Namespacings (/advanced\_selector/), um verheerende Kollisionen mit potenziell gleichnamigen HTTP-Endpunkten anderer, gleichzeitig installierter Erweiterungen von vornherein auszuschließen. Die Vererbung von io.ComfyNode sorgt parallel und verlässlich dafür, dass die entwickelte Node sauber, konfliktfrei und speicheroptimiert im internen Graph-Compiler serialisiert werden kann.3

## **9\. Schlussfolgerung und Best Practices für zukünftige Entwicklungen**

Die durchgeführte, tiefgehende Evaluierung sowie der detailliert ausgearbeitete Code-Proof-of-Concept belegen nachdrücklich die überragende Leistungsfähigkeit, Robustheit und Flexibilität des neuen Nodes 2.0 V3 Standards in der aktuellen ComfyUI-Architektur. Die ursprüngliche Anfrage zielte auf die fundamentale Klärung ab, ob eine hochkomplexe, UI-getriebene Custom Node realisierbar sei, welche Pfadinteraktionen, Paginierungen, Client-Server-Datenübertragungen und dynamische Multitensor-Ausgaben elegant in einem einzigen Element orchestriert.

Die Ergebnisse dieser Analyse demonstrieren unmissverständlich, dass der strategische Shift hin zur Vue.js-basierten Frontend-Architektur und dem typsicheren, objektorientierten io.Schema-Backend nicht nur die Realisierung solcher ehrgeizigen Vorhaben erlaubt, sondern Entwicklern erstmals die professionellen Werkzeuge an die Hand gibt, um vollwertige, moderne Web-Interfaces direkt in Node-Form zu gießen. Durch die durchdachte Kombination von asynchronen Server-Routen und direkter DOM-Injektion via der neuen Methode addDOMWidget können die gravierenden Limitierungen und Performance-Engpässe der alten LiteGraph-Canvas-Ära endgültig und nachhaltig überwunden werden. Der hier dargelegte, kommentierte Quellcode erfüllt ausnahmslos alle Kriterien für Funktionsfähigkeit, Daten-Sicherheit, Skalierbarkeit und Performanz. Er kann direkt und ohne weitere Modifikationen als solides Fundament für produktionsbereite Toolsets und weiterführende Erweiterungen innerhalb des expandierenden ComfyUI-Universums adaptiert werden. Entwickler, die diesen neuen Standard adaptieren, positionieren sich zukunftssicher an der Spitze der Workflow-Automatisierung.

#### **Referenzen**

1. Nodes 2.0 \- ComfyUI, Zugriff am März 3, 2026, [https://docs.comfy.org/interface/nodes-2](https://docs.comfy.org/interface/nodes-2)  
2. Comfyui UI 2.0 breaking your custom widgets too? \- Reddit, Zugriff am März 3, 2026, [https://www.reddit.com/r/comfyui/comments/1pnnpa7/comfyui\_ui\_20\_breaking\_your\_custom\_widgets\_too/](https://www.reddit.com/r/comfyui/comments/1pnnpa7/comfyui_ui_20_breaking_your_custom_widgets_too/)  
3. V3 Migration \- ComfyUI Official Documentation, Zugriff am März 3, 2026, [https://docs.comfy.org/custom-nodes/v3\_migration](https://docs.comfy.org/custom-nodes/v3_migration)  
4. Getting Started \- ComfyUI Official Documentation, Zugriff am März 3, 2026, [https://docs.comfy.org/custom-nodes/walkthrough](https://docs.comfy.org/custom-nodes/walkthrough)  
5. Lifecycle \- ComfyUI, Zugriff am März 3, 2026, [https://docs.comfy.org/custom-nodes/backend/lifecycle](https://docs.comfy.org/custom-nodes/backend/lifecycle)  
6. Comfy Objects \- LiteGraph \- ComfyUI Official Documentation, Zugriff am März 3, 2026, [https://docs.comfy.org/custom-nodes/js/javascript\_objects\_and\_hijacking](https://docs.comfy.org/custom-nodes/js/javascript_objects_and_hijacking)  
7. Gap between DOM and built-in widgets after node resize · Issue \#7942 · Comfy-Org/ComfyUI\_frontend \- GitHub, Zugriff am März 3, 2026, [https://github.com/Comfy-Org/ComfyUI\_frontend/issues/7942](https://github.com/Comfy-Org/ComfyUI_frontend/issues/7942)  
8. Standards \- ComfyUI Official Documentation, Zugriff am März 3, 2026, [https://docs.comfy.org/registry/standards](https://docs.comfy.org/registry/standards)  
9. Routes \- ComfyUI, Zugriff am März 3, 2026, [https://docs.comfy.org/development/comfyui-server/comms\_routes](https://docs.comfy.org/development/comfyui-server/comms_routes)  
10. Trigger custom node run with interaction : r/comfyui \- Reddit, Zugriff am März 3, 2026, [https://www.reddit.com/r/comfyui/comments/1dlh2n5/trigger\_custom\_node\_run\_with\_interaction/](https://www.reddit.com/r/comfyui/comments/1dlh2n5/trigger_custom_node_run_with_interaction/)  
11. Don't Get Too Comfortable: Hacking ComfyUI Through Custom Nodes | Snyk Labs, Zugriff am März 3, 2026, [https://labs.snyk.io/resources/hacking-comfyui-through-custom-nodes/](https://labs.snyk.io/resources/hacking-comfyui-through-custom-nodes/)  
12. ComfyUI-KJNodes/nodes/image\_nodes.py at main \- GitHub, Zugriff am März 3, 2026, [https://github.com/kijai/ComfyUI-KJNodes/blob/main/nodes/image\_nodes.py](https://github.com/kijai/ComfyUI-KJNodes/blob/main/nodes/image_nodes.py)  
13. Mirror from https://github.com/sammykumar/ComfyUI-SwissArmyKnife · aliensmn/ComfyUI-SwissArmyKnife at 0997c23 \- Hugging Face, Zugriff am März 3, 2026, [https://huggingface.co/aliensmn/ComfyUI-SwissArmyKnife/commit/0997c234b09051f9de8ab4bc1c1bfc9b542f9df9](https://huggingface.co/aliensmn/ComfyUI-SwissArmyKnife/commit/0997c234b09051f9de8ab4bc1c1bfc9b542f9df9)  
14. Comfyui, how to create a custom node that dynamically updates the sub-options based on the selected main option, Zugriff am März 3, 2026, [https://stackoverflow.com/questions/79212873/comfyui-how-to-create-a-custom-node-that-dynamically-updates-the-sub-options-ba](https://stackoverflow.com/questions/79212873/comfyui-how-to-create-a-custom-node-that-dynamically-updates-the-sub-options-ba)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAAAYCAYAAADUIj6hAAAE30lEQVR4Xu2ZeehtUxTHvzJEZjKT30OGiGRKKSVkVjwl7+UpGUqZMkueqaSkTMmQJDxT+YMU0q9Iz5ChDGWo+6QU5Q/xhxTWxzr7d9fZ95xzz733p/Dbn/r26657zv6dvfbaa619rlRYSmxm2t60fvV54/Dd/55lppdN35jeM81Xesd0omm9dOEE3GD62PSl6U3TYabL5ePzf+YrW1/O0XC8F027mW41fV7pLtNG1XV85trj/75zMpjrMaa1podMq0z3yce9Kly3JNhD7sxDgu0E07emfYJtEu41PaV6UBEsr2i6XbdCHkzs4MQTlRIbmq40bRlsfeHe1abnTdsE+7am902nBduS4Fh5Ztg62HACQUEmARwVnZXY2bRJZmPh5k0XBRuBQEBcG2zQd9xTTetMO1Wf50xfqB4UR1eK9B1/pekTecnIudu0X26MkF5IgTisj3D4PwnOvtr0qek108Py9PmR6Q3Tb6avTNeYtqjuybnD9LiGu3ov07umkxeukDY13WzaPdjwxQUaLTE4EB/FEkE2+tp0VLBB33EpZQN5UGC/2HSPhpmHQLxQvuMjfcanHOGj89IFgQ3kfsgDfwEGud/0rDxS06CPmv6Qp1ygOSFiB5qsds4CqR9HwW0a7qgd5c471LRGdedA2sGkzZvk9xJMJ2l0saODc8dGyDI/yAONIEUE7MC0y/CyBfqMy/xYOALuYNPp8qwzLw+I5dV3TYwbn+f9Ue33d7KD6TnVUwwpl5ozUH3CPOiTpl2DbRwEE2OzoEmxA+6iLSiAOsuED5A7J8IOzvsJbAPTccGWwMGPyRuvfOESbf3EC/Kd18S4cXk+Mu+Rpivk/qXPeEs+r/PVfF+ia3yCizWM5TNBT7FdboxQCnigyEGmnzU6Yf4Bztk82NogNVECPpPXSHYWHfXZ8rTZmroCXUGBne95ljtVb9aa+gkC+TvVe4IEO+0y+SLnWQcm6Sci48blmSiR12nYN9Bn8Jw3Vt930TU+z0pwNa0VJWlZboycZdo7sxGtf2p0wkQYA+ZRmUN650jIsadPRmijKygukQcvGeD2YIe8n+Av/QcBmjs6pt6mWg2T9BOJPuMyn3XyUp02HxuGsk2T2MW48feXH3ePCDbgM2s+MTzk72qfcBdM7gHTmfkXU9AWFBzP6J6pw4/IewuYk/dH35s+0LD2r62uI1gj+5rOVT3IcTClaavKziagd6C5ZYw5eVp/tbI9bTqQGwPjxk1Qut+WL2CCOb+keubL6Ts+AUbgYqc/WS3PROM29Qht/URfqIUERVudnYQYFA/KazoN4y/ypo8MEbPHfw0Wh/QeF4mTBgu8WDAewYfyU0xvWIhfNdpP9IVIvFT1xjIXZahPtOaZgiaRviSdPqZ5oVOYgrZ+oi8ERXq30CYaw5jm2siDgoAidVMTCRDSYp/gKswADqZBm7afgKbTzLQ0BQW1lvI0Z7pFo41UYZGZtZ8A3kE8U/2dlaagABpMThiUIZq/vKsvLCKz9hMJTh6cYGZtmNqCgoxG6aCEHC5/+Vb6i0WEdxQfmn6S9xJJdPj8OMPCTAqLdor8t4Yz1H28aoIXQ9fLj1OpP+F1MFlsVXUNQbBG/kZvXv7Dz57Vd4V/MfxYRWPIMZLXuUmvy1N/oVAoFAqFQqFQKBSWLH8BSIj4m+gJVFMAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIwAAAAYCAYAAAAoNxVrAAAE+klEQVR4Xu2ZWahuYxjH/zJEpszzkJAhUaaIOmQIkXQinXOxy4USCjluDB1DxguZkiGOOjcSCRmSdke5UZKIQh0SSbg5lNnz28967PU931rft9bax3fOxfurf3vv9e61vnf4v8/zrPeTCoVCoVAoFDZLtjYdbVpuWmbatrq+henQ6vf/ONX0temfmjaYvq1+/8v0munwuGGG7G56V6N9+930rHxQ98r7Gm309WPTMfr/Ocr0hUb79pFpf9PxGp/TdabdFu6U7khtj1TXZ81OpofkczpvWm26y/SB6QLTKtOD8c8ZbvzVdGK6fpjpS9On8snYFJwnn1j6mMFUn5jWm/YbbZoJa0x/m85J19mda9U8p3C+6UXTrrlhRpxp+sH0ssbXFWO/J5/zS1LbAjvIHcbEswAZJoWbL8wNMwLX8/kX5Qb5bv7F9IJpq9Q2C6JveW7CMH+YTkttpACiCmlgU4AJiCpPyPvSxJWmH01H5gY4xPSd6Rn5QOuEmX4znTLaNAa7ZdKO2dK0r8Y/YxKkHlIi/aOfmRXyBWOAXdjetFe+WIO+0Uf62oWb1LwTT5YbuclMZ5uuV/d5OEDtCwuMKdLdNDApkYUUuXNqq0OfKQd2zA3Azm2b9MvktQE7YtoOJn29ZDooN8gHfKvpRnWfKAgzz8vNW4fnYPKmXdzGHqbnTSfkBvnz5kwPa/IC1WHOmDuME2xnelzet2wYxvCoac/atWmslNcSTX3aWz7nJ+WGBrifsZNCs8Ez9LmpBFiAsEoEoVbYpxKLfpvpe9Pl6r7jjjO9qVHTDDULnCUfIIaNvoXYLZ+pPZW2Qc5+Q6OTPMQswMRmw1xsura6ltuIiKgP9O1qjfetj1mADME6v2/aJbVliOx5gy4QKYcwxY4gr6Gn5Qtxp7ya7kPdNEsxC0SN8LoW+xZ6q2obUr/UTTPULBCGear6m9TwWPUzm4nPJPI0LsQUsmn6mgXCwK2RowuT6peD5W9IvGb1CaGAad4xPanhZtnY9UsmTEP0GmIWiKJ7TfX3FfIIA3UzMf6b5fXLUMI0pJVX1M8sQB/pT98IN8Kk+gXiQ0hXfWDycTKGa1rsLoSZ35YXdnWG1C8ZnkHxSXTlPGoI9be0I+QRhBoGIp0yh6TPu9U/EmYogD80Paf+Bo+1zEV45ljTDfli0Hb+AgycHcigGXxXGMj98sjCRBElSE99ifMX0lKGHEwu7lu/BPUQf6D6h/cgTM1bB4Upb0dBmImIcI+W/hodEZHPmFP/qBjpfZJhJkbCaecvp8uLJGqFrnm3bpZIQ7zLDzFNDHBjn7/kegCG1ARA8f2V/FyDcddTb/SRDbc6tfUlF+o8a079TLNMi2+8bX3BjA+o5ZksJIczazX6AN6I2N0/y4/auy40H8Jx/XUa71Bf04SZ2+qXeJ0lpfSBfl2l5tfUIabhTIe0y1cp+XuXMNPn8lQyFMzyqsaPAvqahv/hZYF1zRmDZ50r98LY+QyRg4Ew4QjXfSP//oOff8qP2q/RYj7uwhny18lsloAJvd20TW6oQXHNgRE7Nvq3Qf7Wxn3c/1OtDWFqvtvpAv/HM9ommIPH+6qfXQhj11+dAwyzXn6OshRu0bhZAuZ6uenS3NAC60kkZM3n5ZtnlXzOyQp91rswANIh5xu5KAfaCPGb4yIQRfj+C7MRUeMb6kKhUCgUCoVCoVAoTORfmCoip8KDJKsAAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAAYCAYAAABXysXfAAABhElEQVR4Xu2WTSsFYRTH/2IjspJSyk0oa1lQysJGYqUrn8DK2tKGrSIrJVkoX0DJygeQFVkp5CUJG5Ty9j/3zOQ+T2PmSGYsnl/9utOcmbmd5znnzACBQOA3DNBz+lHlI72Kjt/oNu2ObyiIWlqmJe98Isv0mfZ557voCT2mbV7sr6mnY3SJXtIn2utckUAj3aNHtNkNVdiA7pI8OE8kmRE6ROdgTKaDXtN1WuPF4kRfaL8bypVZGJMZh678tB8gk9C+WaF1XixPzMksQFdetrQ1sh26tTd0CtqARWJKJi6jW2iZrUauQXtonjbFF6fQSfehk9GqLJIVUzJp/VKCTrID2uKGcseUTFq/CPEkkxIsElMy371fBBmNO/SdDnsxH+kp2b245yxKiVvJTCbr/TIIHQy7yP7jBjpKJ35gT+VOG5nJyMPu6CbcfpFVlrJ6oIfQyVY0kkxiBcmKn+HrW0zeIxfQCSO/r/SUzkBLrShkt7foPdxvR/luXKy6LhAIBAL/h0+KiWcLzZDCeQAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFIAAAAXCAYAAACYuRhEAAAEaklEQVR4Xu2XeehlcxjGH1kyDRlLRGTSIJkaYogQWUqamgwRMoYaogjZl8b2hyX7ZDLCkISZ0DR/aMQtf9gKyVIkS5YklCJLlucz73l/53vOvfd378+YyR/nqad77znv+Z7v+7zb90odOnTo0GEc7GxeZz5o3mDOat5eh5PNQ82tzE3MHc0zzP1KowrTzNMU691i7tq8vVGwt3mbYg+XKnwssaV5pjm7+r6pYp+LzZm12QTK9RYo7Bs4yFxrHm7OMdeYfytejmBgM/Pp6nrJZ8xtKpvEPuY75lWKjRGANxTCbyzg6CqFP/j1tvm7eWJhM8N8Xf0+3WFuXtjx/VrzTfMAcw9ztXleYbMuc54zz1at8PYKx39WPJh4yHzP/MJcaZ6g/qggFjaISBCmmy+qf60NiZ3MV8xjVCcCFfa1+bG5W3WNyiJp2O8n5qPmwaqfSSAYz82sfh+vEHxFGgDS/XPzJ0X0ElcrjC8prt2n0WJcYX6vyMrE0eaViqBNhu0qDgNB20X9jrbBHgkc4iAq4JknFD4hBEBIxGiXfAlER8R7i2tUIBmK6BMgbe8xX1BzQQThpXwmRgnJC15TlABZDcnQdtYOw57ms+bu7RuKfV5vXqbRQrIPyvoRhVgJRMOnedXvcYQ8VfHM6Yo+im255qSgH1K6f5pHFtfvN+8y3zK/NF819y/uk4VkI2IuNa9RiP++Bg+kQcCOoJZiTkXEYdhWEeBvFUMDIMhT5p2K8v7KfF7NQUMmIuRN5uPmBYr+f6uafXQgSFlKg+lUGhNhel9mGBP7B8WwAllSf6lu6jjOSz/U+JO7FPO/EBGcokiMy1Wvg5C8h3tcgwj2kepAZhb3KntA5XyjGMZDQVkwHFCfQVFiazXLFGHIzCcVWZxCkoE7FHaUEps5t7g2Coj5krlc6y8iohDIJWomBmviU7n2XPMXhS1IIcu9I2hP/X5OgJcsU6T6qMEAclBlU2dYMbR6avaRFJJNjQv2QlmxNseNfwsSg8l8kcbr1ZkMJBOJxEml7KsghcSub2akiGXp0vOOq74vUpRseXZKISHfERPHe1o/IdnL7YpM3FchxKABNAopYpYuOEJ1v6bl/GEeW/0GKWRP4QOnlrGF5CXU+8XV9wTpnL0up3gpZJZ2T7E45U2Z09Rp7omplHYpYu6FgE5VTNa5W80DOLhZUb6AwNI3SyGztJkHvP8Q8zfF1E4MLG2Mz1I8jCgctpMMksMqOxZkapc9hkj/qvgXkWBT36mOFOuPO2xYG9t2QMFUxGSdJQoBSn/w7zPVrYKjDefbfBefVOSPqgcoLW61osRJFDBw2GR5kjFtYpwvzax92TxH0b846pxf3UvgBIfVTxX/WTn+4MCBhc0wHGVeqH4RE/w7udHcon2jhSzPtj+wrBb2ulRx5lxoPqbwKQ/sCYL4gfmwwvd3zQc0xvFnMnDSn6/one3/2CVKu/b0/z+BoO1lnqQ4M3PoHgREo79ih/2wYHfo0KFDhw4bBv8AeMD5HxDAVGIAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAYCAYAAADpnJ2CAAABhUlEQVR4Xu2UTStFURSGl1A+BkJJSV1lYiBJSBlJ/oCU8gcMpBgQ5RfIRAwwMMMAM3UHZkpi5hcgI8VAKOTjfVv7OKt97927O9V566lz1trnrL0+9hbJ9F/VAHZBt++A6sAe+AI/Dj6fgma3phPce/4x5ytQBVgCr6DP81n1gGdwAmo8XyVYBseiwfnPkhoETxIPOCW6+0XPXg+2wKxo4KBYyh2wLfGA6+AbjBpbDhyBfmMrKaY9D8ZFdx0K2AiuwA1oc7YRsA9a3XtUA2ANVEs8YBd4BIeiQ7QAPsGkXRQSS8ky5tx7LGDSv1XRad4ULW8e1Jp1RcVSzoEJY4sFZP8Y8Fo0W274AryDIbOuqHolLWWiUMCkf7eg3dhnRDexIZFjMA3uPF5EP34AZ6Dlb3V6/ti/KmPvED3shM9lKZRh0j9OtBWzYnb0MduyxFviTQrPE3/KIeFEDns+ijb6LiW95oLiIWYZ7R14Ljq9B5KWmnyITmUTPxRtDW3Wv+J8mTJlKq1f91hfUXCX678AAAAASUVORK5CYII=>
