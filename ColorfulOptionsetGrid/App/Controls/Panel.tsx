// Panel.tsx
import * as React from 'react';
import "./popup.css"

const Panel: React.FC = () => {
    return (
        <ul className="popup" style={{ left: `95px`, top: `50px`, position: 'absolute', zIndex: 1 }}>
            {<li> 123 </li>}
            {<li> 456 </li>}
        </ul >
    );
};

export default Panel;
