const User = require('../models/User');
const bcrypt = require('bcryptjs');

const departments = [
    {
        name: 'IT',
        hr: {
            name: 'IT HR Manager',
            email: 'it.hr@company.com',
            password: 'it123'
        },
        employees: [
            {
                name: 'John Smith',
                email: 'john.smith@company.com',
                password: 'john123',
                department: 'IT',
                location: 'New York'
            },
            {
                name: 'Sarah Johnson',
                email: 'sarah.johnson@company.com',
                password: 'sarah123',
                department: 'IT',
                location: 'San Francisco'
            }
        ]
    },
    {
        name: 'Finance',
        hr: {
            name: 'Finance HR Manager',
            email: 'finance.hr@company.com',
            password: 'finance123'
        },
        employees: [
            {
                name: 'Michael Brown',
                email: 'michael.brown@company.com',
                password: 'michael123',
                department: 'Finance',
                location: 'Chicago'
            },
            {
                name: 'Emily Davis',
                email: 'emily.davis@company.com',
                password: 'emily123',
                department: 'Finance',
                location: 'Boston'
            }
        ]
    },
    {
        name: 'Marketing',
        hr: {
            name: 'Marketing HR Manager',
            email: 'marketing.hr@company.com',
            password: 'marketing123'
        },
        employees: [
            {
                name: 'David Wilson',
                email: 'david.wilson@company.com',
                password: 'david123',
                department: 'Marketing',
                location: 'Los Angeles'
            },
            {
                name: 'Lisa Anderson',
                email: 'lisa.anderson@company.com',
                password: 'lisa123',
                department: 'Marketing',
                location: 'Seattle'
            }
        ]
    },
    {
        name: 'Operations',
        hr: {
            name: 'Operations HR Manager',
            email: 'operations.hr@company.com',
            password: 'operations123'
        },
        employees: [
            {
                name: 'Robert Taylor',
                email: 'robert.taylor@company.com',
                password: 'robert123',
                department: 'Operations',
                location: 'Houston'
            },
            {
                name: 'Jennifer White',
                email: 'jennifer.white@company.com',
                password: 'jennifer123',
                department: 'Operations',
                location: 'Miami'
            }
        ]
    },
    {
        name: 'Human Resources',
        hr: {
            name: 'HR Manager',
            email: 'hr@company.com',
            password: 'hr123'
        },
        employees: [
            {
                name: 'Thomas Lee',
                email: 'thomas.lee@company.com',
                password: 'thomas123',
                department: 'Human Resources',
                location: 'Washington DC'
            },
            {
                name: 'Maria Garcia',
                email: 'maria.garcia@company.com',
                password: 'maria123',
                department: 'Human Resources',
                location: 'Dallas'
            }
        ]
    }
];

// Default HOD user
const hodUser = {
    name: 'HOD Admin',
    email: 'hod@company.com',
    password: 'hod123',
    role: 'hod',
    department: 'Administration',
    location: 'Headquarters'
};

async function initializeUsers() {
    try {
        // Create HR users for each department
        for (const dept of departments) {
            // Create HR user
            const existingHR = await User.findOne({ email: dept.hr.email });
            if (!existingHR) {
                const hrUser = new User({
                    ...dept.hr,
                    role: 'hr',
                    department: dept.name,
                    location: 'Headquarters'
                });
                await hrUser.save();
                console.log(`Created HR user for ${dept.name}`);
            }

            // Create employees
            for (const employee of dept.employees) {
                const existingEmployee = await User.findOne({ email: employee.email });
                if (!existingEmployee) {
                    const empUser = new User({
                        ...employee,
                        role: 'employee'
                    });
                    await empUser.save();
                    console.log(`Created employee: ${employee.name}`);
                }
            }
        }

        // Create default HOD user
        const existingHOD = await User.findOne({ email: hodUser.email });
        if (!existingHOD) {
            const hod = new User(hodUser);
            await hod.save();
            console.log('Created default HOD user');
        }

        console.log('User initialization completed successfully');
    } catch (error) {
        console.error('Error initializing users:', error);
        throw error;
    }
}

module.exports = initializeUsers; 