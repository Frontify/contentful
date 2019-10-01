import {setup} from '../lib/shared-dam-app';

import logo from './logo.svg';
import {init} from 'contentful-ui-extensions-sdk'

const CTA = 'Select files from Frontify';

init(sdk => {
    sdk.window.startAutoResizer();

    setup({
        cta: CTA,
        name: 'Frontify',
        logo,
        color: '#363D4A',
        description:
            'The Frontify app is a widget that allows editors to select media from their Frontify account. Select a file on Frontify and designate the assets that you want your entry to reference.',
        parameterDefinitions: sdk.parameters.installation,
        makeThumbnail,
        renderDialog,
        openDialog,
        isDisabled,
        validateParameters
    });
});

function makeThumbnail(resource) {
    const url = resource.preview_url;
    const alt = resource.title;

    return [url, alt];
}

function renderDialog(sdk) {
    const config = sdk.parameters.invocation;

    // prepare iframe
    const container = document.createElement('div');
    const iframe = document.createElement('iframe');
    const target = config.domain + '/external-asset-chooser';

    container.className = 'container';
    iframe.src = target;
    container.appendChild(iframe);
    document.body.appendChild(container);

    const chooser = iframe.contentWindow;

    // cross document messaging
    window.addEventListener('message', e => {
        if (!e.data || e.data.aborted) {
            sdk.close([]);
            return;
        }

        if (e.data.error) {
            console.error(e.data.error);
        }

        // The Asset Chooser is fully loaded and now requests the API Access Token.
        if (e.data.configurationRequested) {
            chooser.postMessage({token: config.accessToken, mode: 'tree', multiSelectionAllowed: true }, target);
        }
        else {
            if(e.data.assetsChosen) {
                sdk.close(e.data.assetsChosen);
            }
            else {
                sdk.close([])
            }
        }
    });
}

async function openDialog(sdk, _currentValue) {
    const result = await sdk.dialogs.openExtension({
        position: 'center',
        title: CTA,
        shouldCloseOnOverlayClick: true,
        shouldCloseOnEscapePress: true,
        parameters: {...sdk.parameters.installation, ...sdk.parameters.instance },
        width: 1400
    });

    if (!Array.isArray(result)) {
        return [];
    }

    return result.map(item => ({
        ...item,
        src: item.preview_url
    }));
}

function isDisabled() {
    return false;
}

function validateParameters({ domain }) {
    const hasValidProtocol = domain.startsWith('https://');
    const isHTMLSafe = ['"', '<', '>'].every(unsafe => !domain.includes(unsafe));

    if (hasValidProtocol && isHTMLSafe) {
        return null;
    }
    else {
        return 'Provide a valid Frontify URL.';
    }
}