const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateApprovalLetter = async (transferData) => {
    return new Promise((resolve, reject) => {
        try {
            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(__dirname, '../public/uploads/approval-letters');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Generate unique filename
            const filename = `transfer_${transferData.employee._id}_${Date.now()}.pdf`;
            const filepath = path.join(uploadsDir, filename);

            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50
            });

            // Pipe PDF to file
            doc.pipe(fs.createWriteStream(filepath));

            // Add company header
            doc.fontSize(20)
               .text('Employee Transfer System', { align: 'center' })
               .moveDown();

            // Add title
            doc.fontSize(16)
               .text('Transfer Approval Letter', { align: 'center' })
               .moveDown();

            // Add date
            doc.fontSize(12)
               .text(`Date: ${new Date().toLocaleDateString()}`)
               .moveDown();

            // Add employee details
            doc.fontSize(12)
               .text('Employee Details:')
               .moveDown()
               .text(`Name: ${transferData.employee.name}`)
               .text(`Employee ID: ${transferData.employee._id}`)
               .text(`Current Department: ${transferData.fromDepartment}`)
               .text(`New Department: ${transferData.toDepartment}`)
               .moveDown();

            // Add approval details
            doc.text('Approval Details:')
               .moveDown()
               .text(`HR Manager: ${transferData.approvedBy.hr.name}`)
               .text(`HOD: ${transferData.approvedBy.hod.name}`)
               .moveDown();

            // Add comments
            doc.text('Comments:')
               .moveDown()
               .text('HR Comments:')
               .text(transferData.comments.hr)
               .moveDown()
               .text('HOD Comments:')
               .text(transferData.comments.hod)
               .moveDown();

            // Add signature section
            doc.text('Signatures:', { underline: true })
               .moveDown()
               .text('HR Manager: _________________')
               .text('HOD: _________________')
               .moveDown();

            // Add footer
            doc.fontSize(10)
               .text('This is an electronically generated document.', { align: 'center' });

            // Finalize PDF
            doc.end();

            // Resolve with the filepath when done
            doc.on('end', () => {
                resolve({
                    filename,
                    filepath: `/uploads/approval-letters/${filename}`
                });
            });

            // Handle errors
            doc.on('error', reject);

        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    generateApprovalLetter
}; 