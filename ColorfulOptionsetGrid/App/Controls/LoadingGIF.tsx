import * as React from 'react';

const LoadingGIF = (props: any) => {

    var style = {
        margin: "auto",
        width: "32px",
        height: "32px"
    };

    return (
        <div className='ColorfulOptionsetGrid pcf-container-loading'>
            <img style={style} src='/WebResources/el_loading.gif'></img>
        </div>
    );
};

export default LoadingGIF;
