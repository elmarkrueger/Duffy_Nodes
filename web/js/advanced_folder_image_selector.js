/**
 * Advanced Folder Image Selector - Frontend UI (Nodes 2.0 Compatible)
 * Provides an interactive thumbnail browser with pagination, sorting, and selection.
 */

import { api } from "../../../scripts/api.js";
import { app } from "../../../scripts/app.js";

app.registerExtension({
    name: "Duffy.AdvancedFolderImageSelector",

    async nodeCreated(node) {
        // Only apply to our specific node class
        if (node.comfyClass !== "DuffyAdvancedFolderImageSelector") return;

        // ====================================================================
        // STATE MANAGEMENT
        // ====================================================================
        let allThumbnails = [];
        let selectedImages = [];
        let currentPage = 1;
        const itemsPerPage = 9;
        let sortMode = 'filename';

        // Get references to the input widgets
        const pathWidget = node.widgets.find(w => w.name === "folder_path");
        const stateWidget = node.widgets.find(w => w.name === "selected_images_state");

        // Hide the state widget (used only for serialization)
        if (stateWidget) {
            stateWidget.type = "hidden";
            stateWidget.computeSize = () => [0, 0];
        }

        // Load previously selected images from state
        if (stateWidget && stateWidget.value) {
            try {
                const parsed = JSON.parse(stateWidget.value);
                if (Array.isArray(parsed)) {
                    selectedImages = parsed;
                }
            } catch (e) {
                selectedImages = [];
            }
        }

        // ====================================================================
        // DOM STRUCTURE CREATION
        // ====================================================================

        // Create container element directly and add as DOM widget
        const container = document.createElement("div");
        Object.assign(container.style, {
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontFamily: "Arial, sans-serif",
            color: "#ffffff",
            backgroundColor: "#222222",
            padding: "12px",
            borderRadius: "8px",
            boxSizing: "border-box",
            border: "1px solid #444"
        });

        // Prevent canvas drag/zoom when interacting with the widget
        container.addEventListener("pointerdown", (e) => e.stopPropagation());
        container.addEventListener("wheel", (e) => e.stopPropagation());

        const domWidget = node.addDOMWidget("advanced_ui_container", "custom", container, {
            serialize: false,
            hideOnZoom: false,
        });
        domWidget.computeSize = () => [420, 500];

        // Control row (buttons)
        const controlRow = document.createElement("div");
        Object.assign(controlRow.style, {
            display: "flex",
            justifyContent: "space-between",
            gap: "8px"
        });

        const btnRefresh = document.createElement("button");
        btnRefresh.innerText = "🔄 Scan Folder";

        const btnSortName = document.createElement("button");
        btnSortName.innerText = "Sort: Name";

        const btnSortDate = document.createElement("button");
        btnSortDate.innerText = "Sort: Date";

        // Style all buttons
        [btnRefresh, btnSortName, btnSortDate].forEach(btn => {
            Object.assign(btn.style, {
                flex: "1",
                padding: "8px 4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                backgroundColor: "#333",
                color: "#eee",
                border: "1px solid #555",
                borderRadius: "4px",
                transition: "background-color 0.2s"
            });
            btn.onmouseover = () => btn.style.backgroundColor = "#555";
            btn.onmouseout = () => btn.style.backgroundColor = "#333";
        });

        controlRow.appendChild(btnRefresh);
        controlRow.appendChild(btnSortName);
        controlRow.appendChild(btnSortDate);
        container.appendChild(controlRow);

        // Status label
        const statusLabel = document.createElement("div");
        Object.assign(statusLabel.style, {
            fontSize: "12px",
            textAlign: "center",
            fontStyle: "italic",
            color: "#aaa"
        });
        statusLabel.innerText = "Please enter a path and click Scan Folder.";
        container.appendChild(statusLabel);

        // Thumbnail grid container
        const gridContainer = document.createElement("div");
        Object.assign(gridContainer.style, {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridAutoRows: "120px",
            gap: "8px",
            backgroundColor: "#111",
            padding: "8px",
            borderRadius: "6px",
            minHeight: "380px"
        });
        container.appendChild(gridContainer);

        // Pagination controls
        const pageRow = document.createElement("div");
        Object.assign(pageRow.style, {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "4px"
        });

        const btnPrev = document.createElement("button");
        btnPrev.innerHTML = "&#9664; Previous";
        
        const pageInfo = document.createElement("span");
        pageInfo.innerText = "Page 0 / 0";
        Object.assign(pageInfo.style, {
            fontSize: "13px",
            fontWeight: "bold"
        });
        
        const btnNext = document.createElement("button");
        btnNext.innerHTML = "Next &#9654;";

        [btnPrev, btnNext].forEach(btn => {
            Object.assign(btn.style, {
                padding: "6px 12px",
                cursor: "pointer",
                fontWeight: "bold",
                backgroundColor: "#0066cc",
                color: "#fff",
                border: "none",
                borderRadius: "4px"
            });
        });

        pageRow.appendChild(btnPrev);
        pageRow.appendChild(pageInfo);
        pageRow.appendChild(btnNext);
        container.appendChild(pageRow);

        // Selection counter
        const selectionCounter = document.createElement("div");
        Object.assign(selectionCounter.style, {
            fontSize: "14px",
            textAlign: "center",
            marginTop: "10px",
            color: "#4CAF50",
            fontWeight: "bold"
        });
        container.appendChild(selectionCounter);

        // ====================================================================
        // HELPER FUNCTIONS
        // ====================================================================

        function updateSelectionCounter() {
            selectionCounter.innerText = `${selectedImages.length} of 10 images selected`;
            if (stateWidget) {
                stateWidget.value = JSON.stringify(selectedImages);
            }
        }

        function renderGrid() {
            gridContainer.innerHTML = "";

            if (allThumbnails.length === 0) {
                pageInfo.innerText = "Page 0 / 0";
                return;
            }

            const totalPages = Math.ceil(allThumbnails.length / itemsPerPage);
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;
            pageInfo.innerText = `Page ${currentPage} / ${totalPages}`;

            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const currentItems = allThumbnails.slice(startIndex, endIndex);

            currentItems.forEach(item => {
                const imgBox = document.createElement("div");
                Object.assign(imgBox.style, {
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                    boxSizing: "border-box",
                    border: "3px solid transparent",
                    borderRadius: "6px",
                    overflow: "hidden",
                    backgroundImage: `url('${item.base64}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transition: "transform 0.1s, border-color 0.2s"
                });

                imgBox.onmouseover = () => imgBox.style.transform = "scale(1.02)";
                imgBox.onmouseout = () => imgBox.style.transform = "scale(1)";
                imgBox.title = item.filename;

                const isSelected = selectedImages.includes(item.path);
                if (isSelected) {
                    imgBox.style.borderColor = "#4CAF50";
                    imgBox.style.boxShadow = "0 0 10px rgba(76, 175, 80, 0.5)";

                    // Selection badge
                    const badge = document.createElement("div");
                    badge.innerText = selectedImages.indexOf(item.path) + 1;
                    Object.assign(badge.style, {
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        backgroundColor: "#4CAF50",
                        color: "#fff",
                        fontWeight: "bold",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.5)"
                    });
                    imgBox.appendChild(badge);
                }

                imgBox.onclick = () => {
                    const index = selectedImages.indexOf(item.path);
                    if (index > -1) {
                        // Deselect
                        selectedImages.splice(index, 1);
                    } else {
                        // Select (if limit not reached)
                        if (selectedImages.length < 10) {
                            selectedImages.push(item.path);
                        } else {
                            alert("Maximum of 10 images can be selected for the available outputs.");
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

        // ====================================================================
        // EVENT HANDLERS
        // ====================================================================

        btnPrev.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderGrid();
            }
        };

        btnNext.onclick = () => {
            if (currentPage < Math.ceil(allThumbnails.length / itemsPerPage)) {
                currentPage++;
                renderGrid();
            }
        };

        btnSortName.onclick = () => {
            sortMode = 'filename';
            sortThumbnails();
        };

        btnSortDate.onclick = () => {
            sortMode = 'date';
            sortThumbnails();
        };

        btnRefresh.onclick = async () => {
            const path = pathWidget.value;
            if (!path || path.trim() === "") {
                statusLabel.innerText = "Error: Path cannot be empty.";
                statusLabel.style.color = "#ff4444";
                return;
            }

            statusLabel.innerText = "Scanning directory and generating thumbnails...";
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
                    statusLabel.innerText = `Error: ${errData.error}`;
                    statusLabel.style.color = "#ff4444";
                    allThumbnails = [];
                } else {
                    const data = await response.json();
                    allThumbnails = data.thumbnails;
                    statusLabel.innerText = `${allThumbnails.length} images successfully indexed and loaded.`;
                    statusLabel.style.color = "#aaa";

                    // Filter out selected images that no longer exist
                    const currentPaths = allThumbnails.map(t => t.path);
                    selectedImages = selectedImages.filter(p => currentPaths.includes(p));

                    sortThumbnails();
                }
            } catch (error) {
                statusLabel.innerText = "Network error while fetching data from backend.";
                statusLabel.style.color = "#ff4444";
                console.error(error);
            } finally {
                btnRefresh.disabled = false;
                btnRefresh.style.opacity = "1";
                node.setSize(node.computeSize());
                app.graph.setDirtyCanvas(true, true);
            }
        };

        // ====================================================================
        // INITIALIZATION
        // ====================================================================

        updateSelectionCounter();
        const requiredSize = node.computeSize();
        node.size = [Math.max(450, requiredSize[0]), Math.max(500, requiredSize[1])];

        // Auto-refresh if a path is already set
        if (pathWidget && pathWidget.value && pathWidget.value.trim() !== "") {
            setTimeout(() => {
                btnRefresh.click();
            }, 600);
        }
    }
});
