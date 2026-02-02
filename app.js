let selectedComponent = null;
let componentCounter = 0;

const canvas = document.getElementById('canvas');
const propertiesPanel = document.getElementById('properties');

// Component templates
const templates = {
    heading: () => ({
        type: 'heading',
        level: 1,
        text: 'Heading',
        render: function() {
            return `<div class="comp-heading"><h${this.level}>${this.text}</h${this.level}></div>`;
        },
        properties: [
            { name: 'text', label: 'Text', type: 'text' },
            { name: 'level', label: 'Level (1-6)', type: 'number', min: 1, max: 6 }
        ]
    }),
    text: () => ({
        type: 'text',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        render: function() {
            return `<div class="comp-text"><p>${this.content}</p></div>`;
        },
        properties: [
            { name: 'content', label: 'Content', type: 'textarea' }
        ]
    }),
    button: () => ({
        type: 'button',
        label: 'Click Me',
        render: function() {
            return `<div class="comp-button"><button>${this.label}</button></div>`;
        },
        properties: [
            { name: 'label', label: 'Button Text', type: 'text' }
        ]
    }),
    input: () => ({
        type: 'input',
        placeholder: 'Enter text...',
        render: function() {
            return `<div class="comp-input"><input type="text" placeholder="${this.placeholder}"></div>`;
        },
        properties: [
            { name: 'placeholder', label: 'Placeholder', type: 'text' }
        ]
    }),
    checkbox: () => ({
        type: 'checkbox',
        label: 'Checkbox label',
        render: function() {
            return `<div class="comp-checkbox"><label><input type="checkbox"> ${this.label}</label></div>`;
        },
        properties: [
            { name: 'label', label: 'Label', type: 'text' }
        ]
    }),
    link: () => ({
        type: 'link',
        text: 'Click here',
        url: 'https://example.com',
        render: function() {
            return `<div class="comp-link"><a href="${this.url}">${this.text}</a></div>`;
        },
        properties: [
            { name: 'text', label: 'Link Text', type: 'text' },
            { name: 'url', label: 'URL', type: 'text' }
        ]
    }),
    code: () => ({
        type: 'code',
        content: 'const hello = "world";',
        render: function() {
            return `<div class="comp-code"><pre><code>${this.content}</code></pre></div>`;
        },
        properties: [
            { name: 'content', label: 'Code', type: 'textarea' }
        ]
    }),
    container: () => ({
        type: 'container',
        children: [],
        render: function() {
            if (this.children.length === 0) {
                return `<div class="comp-container drop-zone" data-container-id="${this.id}"><div class="container-placeholder">Drop components here</div></div>`;
            }
            return `<div class="comp-container drop-zone" data-container-id="${this.id}">${this.children.map(c => renderChild(c)).join('')}</div>`;
        },
        properties: []
    })
};

// Render child component inside container
function renderChild(component) {
    return `<div class="container-child" data-child-id="${component.id}">
        ${component.render()}
        <button class="delete-child-btn">✕</button>
    </div>`;
}

// Drag and drop handlers for palette
document.querySelectorAll('.component-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('componentType', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
    });
});

// Canvas drag handlers
canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Find drop zone
    const dropZone = e.target.closest('.drop-zone, .canvas');
    if (dropZone) {
        dropZone.classList.add('drag-over');
    }
});

canvas.addEventListener('dragleave', (e) => {
    const dropZone = e.target.closest('.drop-zone, .canvas');
    if (dropZone && !dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
    }
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    const componentType = e.dataTransfer.getData('componentType');
    if (!componentType) return;

    // Check if dropped on a container
    const dropZone = e.target.closest('.drop-zone');
    if (dropZone && dropZone.dataset.containerId) {
        addComponentToContainer(componentType, dropZone.dataset.containerId);
    } else {
        addComponent(componentType);
    }
});

// Add component to canvas
function addComponent(type) {
    // Remove empty state
    const emptyState = canvas.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const component = templates[type]();
    component.id = `comp-${++componentCounter}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-component';
    wrapper.dataset.id = component.id;
    wrapper.innerHTML = `
        ${component.render()}
        <button class="delete-btn">✕</button>
    `;

    // Store component data
    wrapper.__componentData = component;

    // Setup handlers
    setupComponentHandlers(wrapper);

    canvas.appendChild(wrapper);
    selectComponent(wrapper);
    saveToLocalStorage();
}

// Add component to container
function addComponentToContainer(type, containerId) {
    const containerWrapper = document.querySelector(`.canvas-component[data-id="${containerId}"]`);
    if (!containerWrapper) return;

    const container = containerWrapper.__componentData;
    
    const component = templates[type]();
    component.id = `comp-${++componentCounter}`;
    
    container.children.push(component);
    
    // Re-render container
    updateComponent(containerWrapper);
    selectComponent(containerWrapper);
    saveToLocalStorage();
}

// Setup component event handlers
function setupComponentHandlers(wrapper) {
    // Click to select
    wrapper.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-btn') && !e.target.classList.contains('delete-child-btn')) {
            selectComponent(wrapper);
        }
        e.stopPropagation();
    });

    // Delete button
    const deleteBtn = wrapper.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.remove();
            if (selectedComponent === wrapper) {
                selectedComponent = null;
                showEmptyProperties();
            }
            if (canvas.querySelectorAll('.canvas-component').length === 0) {
                showEmptyCanvas();
            }
            saveToLocalStorage();
        });
    }

    // Delete child buttons
    wrapper.querySelectorAll('.delete-child-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const childEl = e.target.closest('.container-child');
            const childId = childEl.dataset.childId;
            const component = wrapper.__componentData;
            
            component.children = component.children.filter(c => c.id !== childId);
            updateComponent(wrapper);
            saveToLocalStorage();
        });
    });
}

// Select component
function selectComponent(wrapper) {
    // Deselect previous
    if (selectedComponent) {
        selectedComponent.classList.remove('selected');
    }

    selectedComponent = wrapper;
    wrapper.classList.add('selected');
    showProperties(wrapper.__componentData);
}

// Show properties panel
function showProperties(component) {
    propertiesPanel.innerHTML = '';

    if (component.properties.length === 0) {
        propertiesPanel.innerHTML = '<p class="empty-state">No editable properties</p>';
        return;
    }

    component.properties.forEach(prop => {
        const group = document.createElement('div');
        group.className = 'property-group';

        const label = document.createElement('label');
        label.textContent = prop.label;
        group.appendChild(label);

        let input;
        if (prop.type === 'textarea') {
            input = document.createElement('textarea');
        } else {
            input = document.createElement('input');
            input.type = prop.type || 'text';
            if (prop.min !== undefined) input.min = prop.min;
            if (prop.max !== undefined) input.max = prop.max;
        }

        input.value = component[prop.name];
        input.addEventListener('input', (e) => {
            component[prop.name] = e.target.value;
            updateComponent(selectedComponent);
            saveToLocalStorage();
        });

        group.appendChild(input);
        propertiesPanel.appendChild(group);
    });
}

function showEmptyProperties() {
    propertiesPanel.innerHTML = '<p class="empty-state">Select a component to edit its properties</p>';
}

function showEmptyCanvas() {
    canvas.innerHTML = '<div class="empty-state"><p>👆 Drag components here to start building</p></div>';
}

// Update component render
function updateComponent(wrapper) {
    if (!wrapper) wrapper = selectedComponent;
    if (!wrapper) return;
    
    const component = wrapper.__componentData;
    const deleteBtn = wrapper.querySelector('.delete-btn');
    wrapper.innerHTML = component.render();
    wrapper.appendChild(deleteBtn);
    
    // Re-setup handlers after render
    setupComponentHandlers(wrapper);
}

// Save to localStorage
function saveToLocalStorage() {
    const components = Array.from(canvas.querySelectorAll('.canvas-component')).map(wrapper => {
        return serializeComponent(wrapper.__componentData);
    });
    localStorage.setItem('playground', JSON.stringify(components));
}

// Serialize component with children
function serializeComponent(component) {
    const data = { ...component, render: undefined, properties: undefined };
    if (component.children) {
        data.children = component.children.map(c => serializeComponent(c));
    }
    return data;
}

// Load from localStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem('playground');
    if (!saved) return false;
    
    try {
        const components = JSON.parse(saved);
        
        // Clear canvas
        canvas.innerHTML = '';
        
        components.forEach(data => {
            const wrapper = document.createElement('div');
            wrapper.className = 'canvas-component';
            wrapper.dataset.id = data.id;
            
            // Recreate component with template
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
            
            if (data.id > componentCounter) {
                componentCounter = data.id.replace('comp-', '') * 1;
            }
        });
        
        return true;
    } catch (e) {
        console.error('Failed to load:', e);
        return false;
    }
}

// Clear canvas
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Clear all components? This will also clear your saved work.')) {
        selectedComponent = null;
        showEmptyCanvas();
        showEmptyProperties();
        componentCounter = 0;
        localStorage.removeItem('playground');
    }
});

// Export HTML
document.getElementById('exportBtn').addEventListener('click', () => {
    const components = Array.from(canvas.querySelectorAll('.canvas-component'));
    if (components.length === 0) {
        alert('Add some components first!');
        return;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playground</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
        }
        .comp-button button {
            padding: 0.5rem 1rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
        }
        .comp-button button:hover {
            background: #5568d3;
        }
        .comp-input input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #e1e4e8;
            border-radius: 4px;
            font-size: 1rem;
        }
        .comp-checkbox label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
        }
        .comp-link a {
            color: #667eea;
            text-decoration: none;
        }
        .comp-link a:hover {
            text-decoration: underline;
        }
        .comp-code {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 1rem;
            border-radius: 4px;
            font-family: Monaco, Menlo, monospace;
            font-size: 0.9rem;
            overflow-x: auto;
        }
        .comp-container {
            padding: 1rem;
            border: 1px solid #e1e4e8;
            border-radius: 4px;
            background: #f9fafb;
        }
        .container-child {
            margin-bottom: 0.5rem;
        }
        .container-child:last-child {
            margin-bottom: 0;
        }
    </style>
</head>
<body>
${components.map(comp => renderExportComponent(comp.__componentData)).join('\n    ')}
</body>
</html>`;

    navigator.clipboard.writeText(html).then(() => {
        alert('HTML exported to clipboard! 🎉\n\nPaste it into a .html file and open in your browser.');
    });
});

// Render component for export (handles children)
function renderExportComponent(component) {
    if (component.type === 'container' && component.children.length > 0) {
        return `<div class="comp-container">
    ${component.children.map(c => `    ${renderExportComponent(c)}`).join('\n')}
</div>`;
    }
    return component.render();
}

// Load saved playground on startup
window.addEventListener('DOMContentLoaded', () => {
    const loaded = loadFromLocalStorage();
    if (!loaded) {
        showEmptyCanvas();
    }
});
