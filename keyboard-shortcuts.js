// ==================================================
// Keyboard Shortcuts & Undo/Redo System
// ==================================================

// History management for undo/redo
const history = {
    stack: [],
    currentIndex: -1,
    maxSize: 50,

    push(state) {
        // Remove any "future" history when pushing new state
        this.stack = this.stack.slice(0, this.currentIndex + 1);
        
        this.stack.push(JSON.parse(JSON.stringify(state)));
        
        // Limit history size
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        } else {
            this.currentIndex++;
        }
    },

    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.stack[this.currentIndex];
        }
        return null;
    },

    redo() {
        if (this.currentIndex < this.stack.length - 1) {
            this.currentIndex++;
            return this.stack[this.currentIndex];
        }
        return null;
    },

    canUndo() {
        return this.currentIndex > 0;
    },

    canRedo() {
        return this.currentIndex < this.stack.length - 1;
    },

    clear() {
        this.stack = [];
        this.currentIndex = -1;
    }
};

// Capture current state for history
function captureState() {
    const components = Array.from(canvas.querySelectorAll('.canvas-component')).map(wrapper => {
        return serializeComponent(wrapper.__componentData);
    });
    return {
        components,
        selectedId: selectedComponent?.dataset.id || null
    };
}

// Restore state from history
function restoreState(state) {
    if (!state) return;

    // Clear canvas
    canvas.innerHTML = '';
    selectedComponent = null;
    
    if (state.components.length === 0) {
        showEmptyCanvas();
        showEmptyProperties();
        return;
    }

    // Restore components
    state.components.forEach(data => {
        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-component';
        wrapper.dataset.id = data.id;
        
        // Recreate component
        const component = templates[data.type]();
        Object.assign(component, data);
        component.render = templates[data.type]().render;
        component.properties = templates[data.type]().properties;
        
        // Recreate children
        if (component.children) {
            component.children = component.children.map(childData => {
                const child = templates[childData.type]();
                Object.assign(child, childData);
                child.render = templates[childData.type]().render;
                child.properties = templates[childData.type]().properties;
                return child;
            });
        }
        
        wrapper.__componentData = component;
        wrapper.innerHTML = `${component.render()}<button class="delete-btn">✕</button>`;
        
        setupComponentHandlers(wrapper);
        canvas.appendChild(wrapper);
    });

    // Restore selection
    if (state.selectedId) {
        const targetWrapper = canvas.querySelector(`.canvas-component[data-id="${state.selectedId}"]`);
        if (targetWrapper) {
            selectComponent(targetWrapper);
        }
    } else {
        showEmptyProperties();
    }

    // Don't save to localStorage during undo/redo
    const saved = localStorage.getItem('playground');
    if (JSON.stringify(state.components) !== saved) {
        saveToLocalStorage();
    }
}

// Duplicate selected component
function duplicateComponent() {
    if (!selectedComponent) return;

    const original = selectedComponent.__componentData;
    const duplicate = templates[original.type]();
    
    // Copy all properties
    Object.keys(original).forEach(key => {
        if (key !== 'id' && key !== 'render' && key !== 'properties') {
            if (key === 'children' && Array.isArray(original.children)) {
                // Deep copy children
                duplicate.children = original.children.map(child => {
                    const childCopy = templates[child.type]();
                    Object.assign(childCopy, child);
                    childCopy.id = `comp-${++componentCounter}`;
                    childCopy.render = templates[child.type]().render;
                    childCopy.properties = templates[child.type]().properties;
                    return childCopy;
                });
            } else {
                duplicate[key] = original[key];
            }
        }
    });
    
    duplicate.id = `comp-${++componentCounter}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-component';
    wrapper.dataset.id = duplicate.id;
    wrapper.innerHTML = `
        ${duplicate.render()}
        <button class="delete-btn">✕</button>
    `;
    wrapper.__componentData = duplicate;

    setupComponentHandlers(wrapper);
    
    // Insert after selected component
    selectedComponent.parentNode.insertBefore(wrapper, selectedComponent.nextSibling);
    
    selectComponent(wrapper);
    history.push(captureState());
    saveToLocalStorage();

    showNotification('Component duplicated');
}

// Delete selected component
function deleteSelectedComponent() {
    if (!selectedComponent) return;

    history.push(captureState());
    
    selectedComponent.remove();
    selectedComponent = null;
    showEmptyProperties();
    
    if (canvas.querySelectorAll('.canvas-component').length === 0) {
        showEmptyCanvas();
    }
    
    saveToLocalStorage();
    showNotification('Component deleted');
}

// Navigate to next/previous component
function selectNextComponent(direction) {
    const components = Array.from(canvas.querySelectorAll('.canvas-component'));
    if (components.length === 0) return;

    let currentIndex = selectedComponent ? components.indexOf(selectedComponent) : -1;
    
    if (direction === 'next') {
        currentIndex = (currentIndex + 1) % components.length;
    } else {
        currentIndex = currentIndex <= 0 ? components.length - 1 : currentIndex - 1;
    }

    selectComponent(components[currentIndex]);
    components[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Show temporary notification
function showNotification(message) {
    const existing = document.querySelector('.keyboard-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'keyboard-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 1500);
}

// Keyboard shortcut handler
document.addEventListener('keydown', (e) => {
    // Ignore if typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    // Delete (Del or Backspace)
    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedComponent();
    }

    // Duplicate (Ctrl/Cmd + D)
    else if (modifier && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateComponent();
    }

    // Undo (Ctrl/Cmd + Z)
    else if (modifier && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (history.canUndo()) {
            const state = history.undo();
            restoreState(state);
            showNotification('Undo');
        }
    }

    // Redo (Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y)
    else if (modifier && (e.shiftKey && e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        if (history.canRedo()) {
            const state = history.redo();
            restoreState(state);
            showNotification('Redo');
        }
    }

    // Select next component (Arrow Down)
    else if (e.key === 'ArrowDown' && !e.shiftKey && !modifier && !e.altKey) {
        e.preventDefault();
        selectNextComponent('next');
    }

    // Select previous component (Arrow Up)
    else if (e.key === 'ArrowUp' && !e.shiftKey && !modifier && !e.altKey) {
        e.preventDefault();
        selectNextComponent('prev');
    }

    // Deselect (Escape)
    else if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedComponent) {
            selectedComponent.classList.remove('selected');
            selectedComponent = null;
            showEmptyProperties();
        }
    }

    // Help (?)
    else if (e.key === '?' && !modifier) {
        e.preventDefault();
        showKeyboardHelp();
    }
});

// Show keyboard shortcuts help
function showKeyboardHelp() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const mod = isMac ? '⌘' : 'Ctrl';

    const helpHTML = `
        <div class="keyboard-help-overlay" onclick="this.remove()">
            <div class="keyboard-help-modal" onclick="event.stopPropagation()">
                <h2>⌨️ Keyboard Shortcuts</h2>
                <div class="shortcut-list">
                    <div class="shortcut-item">
                        <kbd>Del</kbd> or <kbd>⌫</kbd>
                        <span>Delete selected component</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>${mod}</kbd> + <kbd>D</kbd>
                        <span>Duplicate selected component</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>${mod}</kbd> + <kbd>Z</kbd>
                        <span>Undo last action</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>${mod}</kbd> + <kbd>⇧</kbd> + <kbd>Z</kbd>
                        <span>Redo action</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>↑</kbd> <kbd>↓</kbd>
                        <span>Navigate between components</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Esc</kbd>
                        <span>Deselect component</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>?</kbd>
                        <span>Show this help</span>
                    </div>
                </div>
                <button onclick="this.closest('.keyboard-help-overlay').remove()" class="close-help-btn">Close</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', helpHTML);
}

// Intercept original functions to add history tracking
const originalAddComponent = window.addComponent;
window.addComponent = function(type) {
    originalAddComponent(type);
    history.push(captureState());
};

const originalAddComponentToContainer = window.addComponentToContainer;
window.addComponentToContainer = function(type, containerId) {
    originalAddComponentToContainer(type, containerId);
    history.push(captureState());
};

// Initialize history with empty state
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        history.push(captureState());
    }, 100);
});

// Add keyboard shortcut hint button to toolbar
window.addEventListener('DOMContentLoaded', () => {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
        const helpBtn = document.createElement('button');
        helpBtn.className = 'toolbar-btn help-btn';
        helpBtn.innerHTML = '⌨️ Shortcuts';
        helpBtn.title = 'Show keyboard shortcuts (?)';
        helpBtn.onclick = showKeyboardHelp;
        toolbar.appendChild(helpBtn);
    }
});
