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
        render: function() {
            return `<div class="comp-container">Empty container - drag components here</div>`;
        },
        properties: []
    })
};

// Drag and drop handlers
document.querySelectorAll('.component-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('componentType', item.dataset.type);
    });
});

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    canvas.classList.add('drag-over');
});

canvas.addEventListener('dragleave', () => {
    canvas.classList.remove('drag-over');
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    canvas.classList.remove('drag-over');
    
    const componentType = e.dataTransfer.getData('componentType');
    if (componentType) {
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

    // Click to select
    wrapper.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-btn')) {
            selectComponent(wrapper);
        }
    });

    // Delete button
    wrapper.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.remove();
        if (selectedComponent === wrapper) {
            selectedComponent = null;
            showEmptyProperties();
        }
        if (canvas.querySelectorAll('.canvas-component').length === 0) {
            showEmptyCanvas();
        }
    });

    canvas.appendChild(wrapper);
    selectComponent(wrapper);
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
            updateComponent();
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
function updateComponent() {
    if (selectedComponent) {
        const component = selectedComponent.__componentData;
        const deleteBtn = selectedComponent.querySelector('.delete-btn');
        selectedComponent.innerHTML = component.render();
        selectedComponent.appendChild(deleteBtn);
    }
}

// Clear canvas
document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Clear all components?')) {
        selectedComponent = null;
        showEmptyCanvas();
        showEmptyProperties();
        componentCounter = 0;
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
        .comp-input input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #e1e4e8;
            border-radius: 4px;
            font-size: 1rem;
        }
        .comp-code {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 1rem;
            border-radius: 4px;
            font-family: Monaco, Menlo, monospace;
            font-size: 0.9rem;
        }
        .comp-container {
            padding: 1rem;
            border: 1px dashed #ccc;
            border-radius: 4px;
        }
    </style>
</head>
<body>
${components.map(comp => comp.__componentData.render()).join('\n    ')}
</body>
</html>`;

    navigator.clipboard.writeText(html).then(() => {
        alert('HTML exported to clipboard! 🎉\n\nPaste it into a .html file and open in your browser.');
    });
});
