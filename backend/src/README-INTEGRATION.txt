BACKEND - STRUCTURE AND INTEGRATION NOTES
=========================================

Project root : Everything/backend
Frontend     : Everything/frontend (separate folder, Vite + React)
Stack        : Node.js, Express, MongoDB (mongoose)

Note: this file is written from the folder listing and the installed
packages. File contents were not reviewed, so the "role" of each file is
based on its name. Correct anything that differs.


FOLDER MAP
----------

backend/
  server.js               starts the app (DB connect + listen)        [usual convention]
  app.js                  creates the Express app, middleware, routes [usual convention]
  .env                    secrets and settings (never commit)
  .gitignore
  package.json

  config/
    database.js           MongoDB / mongoose connection

  routes/                 URL -> controller mapping
    auth.js               register, login, OTP, refresh token, password reset
    contactRoutes.js      contact form
    converter.js          image conversion endpoints
    pdf.js                PDF endpoints
    recharge.js           credit recharge / payment endpoints

  controllers/            request handling, one file per route group
    authController.js
    contactController.js
    imageController.js
    pdfController.js
    rechargeController.js

  middleware/
    auth.js               verifies the access token, sets the current user

  models/                 mongoose schemas
    User.js
    EmailOTP.js           email verification codes
    RefreshToken.js       stored refresh tokens
    Payment.js            recharge / payment records

  services/               heavy logic, called by controllers
    imageService.js       image processing (sharp)
    pdfService.js         PDF creation and reading (pdf-lib, pdfjs-dist)
    zipService.js         zip downloads (archiver)
    paymentService.js     shared payment logic
    payments/
      bkash.js            bKash gateway
      nagad.js            Nagad gateway

  utils/
    cleanup.js            deletes old files in temp / uploads / outputs
    deductCredits.js      takes credits from the user after a job
    email.js              sends email (nodemailer)
    fileUtils.js          file helpers

  uploads/                incoming files (multer)
  temp/                   working files during a job
  outputs/                finished files for download


REQUEST FLOW
------------

  Frontend (services/converterApi.js, services/authApi.js, utils/api.js)
    -> routes/*.js
    -> middleware/auth.js            (protected routes only)
    -> multer                        (file upload, if any)
    -> controllers/*.js
    -> services/*.js                 (sharp / pdf-lib / zip / payment)
    -> utils/deductCredits.js        (charge the user)
    -> response or file from outputs/
    -> utils/cleanup.js              (remove temp files later)


MAIN PACKAGES
-------------

  express, cors, cookie-parser, express-rate-limit    server, cookies, limits
  mongoose                                            MongoDB
  jsonwebtoken, argon2                                tokens, password hashing
  zod                                                 input validation
  multer                                              file uploads
  sharp, @napi-rs/canvas                              images
  pdf-lib, pdfjs-dist                                 PDFs
  archiver                                            zip files
  nodemailer                                          email
  dotenv, cross-env, nodemon                          env and dev tools


IMAGE EDITOR AND THE BACKEND
----------------------------

The image editor (frontend/src/components/editor) runs fully in the
browser, including background removal and AI object removal. Nothing is
sent to the server while editing.

Only the final file is used. ImageEditor calls onComplete(workingFile)
with one PNG File object, and the frontend then sends it like any other
uploaded image (converterApi.js -> routes/converter.js ->
controllers/imageController.js).

Things to keep in mind:
  - The edited file is always PNG (name ends with "-edited.png").
  - Background-removed images have transparency. If the target format
    has no alpha (for example JPG), imageService should flatten onto a
    background colour, otherwise transparent areas turn black.
  - Edited images can be large. Check the multer file size limit and any
    body size limit in app.js.


FRONTEND <-> BACKEND CHECKLIST
------------------------------

  1. Base URL         frontend/src/utils/api.js must point to the backend port.
  2. CORS             app.js must allow the frontend origin (with credentials
                      if refresh tokens use cookies).
  3. Cookies          cookie-parser is installed, so refresh tokens are
                      probably in httpOnly cookies. The frontend must send
                      requests with credentials enabled.
  4. Upload field     the field name used in FormData (converterApi.js) must
                      match the multer field name in routes/converter.js.
  5. Auth header      protected routes need the access token that
                      middleware/auth.js expects.
  6. Static outputs   check how finished files in outputs/ are served, and
                      that download links match.


CLEANUP AND SAFETY
------------------

  - node_quickstart/ is a MongoDB quickstart sample with its own
    node_modules. It is not part of the app. You can delete it.
  - Make sure .env is listed in .gitignore, and never share it.
  - uploads/, temp/ and outputs/ should be emptied regularly
    (utils/cleanup.js). Consider running it on a timer.
  - Keep express-rate-limit on login, OTP and upload routes.
  - Payment callbacks (bkash.js, nagad.js) must verify the payment with the
    gateway on the server before adding credits.