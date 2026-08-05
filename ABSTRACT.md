# Hospital Appointment & Patient Management System (HAPMS)

## Abstract

Modern healthcare facilities face persistent operational challenges due to inefficient manual appointment scheduling, prolonged patient wait times, fragmented medical record storage, and communication breakdowns between healthcare providers and patients. To alleviate these bottlenecks, this project presents the **Hospital Appointment & Patient Management System (HAPMS)**—a responsive, multi-role web application designed to digitize and streamline core clinical and administrative workflows.

The system is architected around a RESTful API service built on **Node.js** and **Express.js**, integrated with a persistent relational database powered by **PostgreSQL** (with lightweight fallback capabilities). The application features dynamic **Role-Based Access Control (RBAC)** across three primary user personas: Patients, Medical Staff/Doctors, and Administrators. Key functional modules include online doctor availability discovery, automated appointment booking and queue management, secure electronic medical record (EMR) management, integrated billing/payment processing, and automated email notifications via **Nodemailer**. 

Security and data privacy are enforced using **JSON Web Tokens (JWT)** for stateless authentication, **Bcrypt** for credential hashing, **Helmet** headers, **rate limiting** to prevent brute-force attacks, and strict server-side input sanitization. The result is a secure, scalable, and user-centric platform that significantly minimizes patient wait times, improves administrative efficiency, and enhances healthcare service delivery.

**Keywords:** *Hospital Management System, Patient Appointment Scheduling, Queue Management, Electronic Medical Records (EMR), Node.js, Express.js, PostgreSQL, Role-Based Access Control.*
