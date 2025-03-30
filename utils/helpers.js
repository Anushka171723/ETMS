const getStatusBadgeColor = (status) => {
    const colors = {
        'pending': 'warning',
        'hr_approved': 'success',
        'hr_rejected': 'danger',
        'hod_approved': 'success',
        'hod_rejected': 'danger'
    };
    return colors[status] || 'secondary';
};

module.exports = {
    getStatusBadgeColor
}; 