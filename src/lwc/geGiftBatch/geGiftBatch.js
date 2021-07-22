import getGiftBatchView from '@salesforce/apex/GE_GiftEntryController.getGiftBatchView';
class GiftBatch {
    _id;
    _name;
    _totals = {};
    _total = 0.00;
    _totalCount = 0;
    _gifts = [];

    async init(dataImportBatchId) {
        this._id = dataImportBatchId;
        const viewModel = await getGiftBatchView({ dataImportBatchId: this._id });
        if (viewModel) {
            this._id = viewModel.giftBatchId;
            this._name = viewModel.name;
            this._totalDonationsAmount = viewModel.totalDonationsAmount;
            this._totals = viewModel.totals;
            // viewModel.gifts.forEach(giftView => {
            //     console.log('Gift View: ', giftView);
            //     this._gifts.push(new Gift(giftView));
            // });
            viewModel.gifts.forEach(gift => {
                this._gifts.push(gift);
            });
        }

        return this.state();
    }

    id() {
        return this._id;
    }

    processedGiftsCount() {
        return this._totals.PROCESSED;
    }

    failedGiftsCount() {
        return this._totals.FAILED;
    }

    failedPaymentsCount() {
        return this._totals.FAILED_PAYMENT;
    }

    expiredPaymentsCount() {
        return this._totals.EXPIRED_PAYMENT;
    }

    authorizedPaymentsCount() {
        return this._totals.AUTHORIZED_PAYMENT;
    }

    totalGiftsCount() {
        return this._totals.TOTAL;
    }

    hasValuesGreaterThanZero() {
        return Number(this._totals.PROCESSED) > 0 || Number(this._totals.FAILED) > 0;
    }

    hasPaymentsWithExpiredAuthorizations() {
        return Number(this._totals.EXPIRED_PAYMENT) > 0;
    }

    isProcessingGifts() {
        return Number(this._totals.PROCESSING) > 0;
    }

    state() {
        return {
            id: this._id,
            name: this._name,
            totalDonationsAmount: this._totalDonationsAmount,
            gifts: this._gifts,
            processedGiftsCount: this.processedGiftsCount(),
            failedGiftsCount: this.failedGiftsCount(),
            failedPaymentsCount: this.failedPaymentsCount(),
            expiredPaymentsCount: this.expiredPaymentsCount(),
            authorizedPaymentsCount: this.authorizedPaymentsCount(),
            totalGiftsCount: this.totalGiftsCount(),
            hasValuesGreaterThanZero: this.hasValuesGreaterThanZero(),
            hasPaymentsWithExpiredAuthorizations: this.hasPaymentsWithExpiredAuthorizations(),
            isProcessingGifts: this.isProcessingGifts()
        }
    }
}

export default GiftBatch;
