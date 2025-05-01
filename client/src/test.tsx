import React from 'react';

const TestComponent: React.FC = () => {
    const unused = "This should trigger a warning";
    return (
        <div>
            <h1>Hello World</h1>
        </div>
    );
} 