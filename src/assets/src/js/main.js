class ReportingQueueItem {
    constructor() {
        this.timeouts = {};
    }

    reportQueueItem(queueItemId, params) {
        const options = ReportingQueueItem.defaultParams(params);
        const modal = this.initModal(options);
        const messageElement = modal.find('.reporting-queue-item__message');
        const outputElement = modal.find('.reporting-queue-item__output');
        const statusElement = modal.find('.reporting-queue-item__status');
        messageElement.text(options.requestingStatusMessage);
        modal.modal('show');
        ReportingQueueItem.requestAndUpdate(queueItemId, options.endpoint, options.outputRequestInterval, outputElement, statusElement, 0);
        const that = this;
        modal.on('hide.bs.modal', function onHideRemoveTimeout() {
            if (that.timeouts.hasOwnProperty(queueItemId)) {
                clearTimeout(that.timeouts[queueItemId]);
            }
        });
    }

    static requestAndUpdate(queueItemId, endpoint, outputRequestInterval, outputElement, statusElement, lastFseekPosition = 0) {
        const that = this;
        $.ajax({
            url: endpoint,
            data: {
                'queueItemId': queueItemId,
                'lastFseekPosition': lastFseekPosition,
            },
            success: function success(data) {
                if (data.error) {
                    outputElement.parent().find('.reporting-queue-item__message').text(data.errorMessage);
                }

                var scrollingTop = ((outputElement[0].scrollHeight - outputElement.scrollTop() - 19) === outputElement.height());

                outputElement.append(data.newOutput);

                const height = outputElement[0].scrollHeight;

                if (scrollingTop) {
                    outputElement.scrollTop(height);
                }

                let statusText = '';
                switch (data.status) {
                    case 0:
                        statusText = polyglot.t('status.disabled');
                        break;
                    case 1:
                        statusText = polyglot.t('status.scheduled');
                        break;
                    case 2:
                        statusText = polyglot.t('status.running');
                        break;
                    case 3:
                        statusText = polyglot.t('status.failed');
                        break;
                    case 4:
                        ReportingQueueItem.modalHide();
                        statusText = polyglot.t('status.complete');
                        break;
                    default:
                        statusText = polyglot.t('status.unknown');
                }
                statusElement.text(statusText);

                if (data.status <= 2) {
                    outputElement.parent().find('.reporting-queue-item__message').text(polyglot.t('itemMessage.processing'));
                    window.reportingQueueItem.timeouts[queueItemId] = setTimeout(
                        function refresh() {
                            ReportingQueueItem.requestAndUpdate(queueItemId, endpoint, outputRequestInterval, outputElement, statusElement, data.lastFseekPosition);
                        },
                        outputRequestInterval
                    );
                } else {
                    outputElement.parent().find('.reporting-queue-item__message').text(polyglot.t('itemMessage.complete'));
                    delete this.timeouts[queueItemId];
                }
            },
        });
    }

    static modalHide(outputElement) {
        if (outputElement.parent().find('.checkbox-reporting-queue-close').is(":checked"))
            outputElement.parent().closest(".modal").modal('hide')
    }


    static defaultParams(params) {
        return {
            'modalTitle': params.modalTitle || polyglot.t('modalTitle'),
            'closeButtonLabel': params.closeButtonLabel || polyglot.t('closeButtonLabel'),
            'statusLabel': params.statusLabel || polyglot.t('statusLabel'),
            'requestingStatusMessage': params.requestingStatusMessage || polyglot.t('requestingStatusMessage'),
            'checkboxCloseModal': polyglot.t('checkboxCloseModal'),
            'outputRequestInterval': 1000,
            'endpoint': params.endpoint || '/deferred-report-queue-item'
        };
    }

    initModal(params) {

        if (typeof(polyglot) === 'undefined') {
            const warningMessage = 'You MUST setup and configure devgroup/yii2-polyglot.';
            /*eslint-disable */
            if (typeof(console) !== 'undefined') {
                console.warn(warningMessage);
            } else if (typeof(alert) === 'function') {
                alert(warningMessage);
            }
        }
        const element = $(`<div class="modal modal-notifier bounceInUp animated">`);
        const dialog = $(`<div class="modal-dialog modal-dialog--reporting-queue-item">`);
        const dialogContent = $(`<div class="modal-content">`);

        const header = $(`
    <div class="modal-header with-border">
      <div class="modal-tools pull-right">
       <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
      </div>
      <h4 class="modal-title">${params.modalTitle}</h4>
    </div>`);

        const body = $(`
    <div class="modal-body">
      <div class="reporting-queue-item">
        <div class="checkbox checkbox-queue-close">
        <label> <input type="checkbox" class = "checkbox-reporting-queue-close" checked>${params.checkboxCloseModal}</label>
        </div>
        ${params.statusLabel}: <span class="reporting-queue-item__status">???</span>
        <div class="reporting-queue-item__message"></div>
        <pre class="reporting-queue-item__output"></pre>
      </div>
    </div>`);

        // hide if timeout is set
        if (params.timeout !== false) {
            setTimeout(function hide() {
                // add bounce out animation
                element
                    .removeClass('bounceInUp')
                    .addClass('bounceOutDown')
                    .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
                    function complete() {
                        // remove element as soon as animation complete
                        element.remove();
                    }
                );
            }, params.timeout);
        }

        dialogContent
            .append(header)
            .append(body);
        dialog.append(dialogContent);

        element
            .append(dialog)
            .hide();

        $('body').append(element);

        return element;
    }

    executeRouteWithReportingQueueItem(route, data = {}, method = 'POST', params = {}) {
        const that = this;
        $.ajax({
            url: route,
            'data': data,
            'method': method,
            success: function ok(queueData) {
                if (queueData.queueItemId) {
                    that.reportQueueItem(queueData.queueItemId, params);
                } else {
                    alert('No queueItemId returned from application.');
                }
            },
            error: function errr(jqXHR, textStatus, errorThrown) {
                alert(textStatus + '\n' + errorThrown);
            },
        });
    }
}

window.reportingQueueItem = new ReportingQueueItem();


