# All Well Online Store

![Node.js](https://img.shields.io/badge/Node.js-v20.15.1-green) ![Express](https://img.shields.io/badge/Express-4.x-blue) ![MongoDB](https://img.shields.io/badge/MongoDB-6.0-success) ![License](https://img.shields.io/badge/License-MIT-lightgrey)

All Well Online Store is a full-stack e-commerce web application built with **Node.js, Express, MongoDB, and EJS**, designed to provide a seamless online shopping experience in Uganda. The platform supports user authentication, product management, shopping cart functionality, checkout, and integrations with WhatsApp and Google/Meta product feeds.

## Features

**Frontend**

* Responsive layout using **Bootstrap 5** and custom CSS
* Dynamic product catalog with categories and meta information
* Shopping cart with session-based persistence
* User dashboard for order tracking and account management
* SEO optimization with meta tags, OG tags, and structured data
* Facebook Pixel and Google Analytics integration

**Backend**

* **Node.js & Express** server with middleware for logging, body parsing, session management, compression, minification, and method override
* Custom middlewares for cart handling, page view tracking, and meta categories
* **MongoDB** database with **Mongoose** for data modeling
* User authentication and role-based access control
* Product management (CRUD) including bulk CSV upload
* Checkout and order processing
* WhatsApp ordering integration
* Sitemap generation for SEO
* Facebook Catalogue and Google Product Feed support

## Folder Structure

```
.
├── config/            # App configuration (DB, admin seeding)
├── middleware/        # Custom middleware functions
├── models/            # Mongoose models
├── public/            # Static files (CSS, JS, images)
├── routes/            # Express routes organized by feature
├── scripts/           # Automation or utility scripts
├── utils/             # Helper functions
├── views/             # EJS templates and layouts
├── app.js             # Main server file
└── package.json
```

## Environment Variables

The application uses the following environment variables in a `.env` file:

```
MONGO_URI=your_mongodb_connection_string
IMGUR_CLIENT_ID=your_imgur_client_id
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_password
SESSION_SECRET=your_session_secret
ADMIN_EMAIL=admin_email_for_seeding
ADMIN_USERNAME=admin_username_for_seeding
ADMIN_PASSWORD=admin_password_for_seeding
FRONT_END_HOST=your_frontend_host_url
MOMO_BASE_URL=mobile_money_base_url
MOMO_SUBSCRIPTION_KEY=subscription_key_for_momo
MOMO_UUID_OR_API_USER=uuid_or_api_user_for_momo
MOMO_API_KEY=momo_api_key
TARGET_ENVIRONMENT=environment_type_for_momo
BUSSINESS_NUMBER=business_number_for_payments
FB_PIXEL_ID=facebook_pixel_id
FB_CAPI_ACCESS_TOKEN=facebook_capi_access_token
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/Allwell241110/All-Well-Online-Node.git
cd All-Well-Online-Node
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root with the environment variables listed above.

4. Seed the initial admin user (runs automatically when server starts).

5. Start the application:

```bash
npm start
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

* Browse products by categories
* Add items to the cart
* Register/Login to make orders
* Checkout via standard payment or WhatsApp integration
* Admin can manage products, categories, and orders via dashboard

## Technologies Used

* **Backend:** Node.js, Express, MongoDB, Mongoose
* **Frontend:** EJS, Bootstrap 5, Font Awesome, Bootstrap Icons
* **Middleware & Utilities:** express-session, connect-mongo, morgan, body-parser, method-override, compression, express-minify
* **Analytics & Marketing:** Facebook Pixel, Google Analytics, OG tags, structured data

## Contributing

Contributions are welcome! Fork the repository, create a branch, commit changes, push to your branch, and open a Pull Request.

## License

This project is open source under the **MIT License**.

## Demo

* **Live Website:** [https://www.allwellonline.shop](https://www.allwellonline.shop)
* **GitHub Repository:** [https://github.com/Allwell241110/All-Well-Online-Node](https://github.com/Allwell241110/All-Well-Online-Node)
