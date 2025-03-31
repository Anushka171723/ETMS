function getStatusBadgeColor(status) {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'hr_approved':
            return 'success';
        case 'hr_rejected':
            return 'danger';
        case 'hod_approved':
            return 'success';
        case 'hod_rejected':
            return 'danger';
        case 'completed':
            return 'info';
        default:
            return 'secondary';
    }
}

module.exports = {
    getStatusBadgeColor
}; 