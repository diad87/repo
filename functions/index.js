// Importar los módulos necesarios y la API v2 de Firebase Functions
const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");

// --> LÍNEA CORREGIDA: Importamos todo lo necesario para Firestore <--
const {getFirestore, FieldValue, collection, addDoc} = require("firebase-admin/firestore");

// Secretos gestionados por Firebase
const stripeSecret = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

// Inicializar Admin SDK
admin.initializeApp();
const db = getFirestore();
const bucket = admin.storage().bucket("kluppy-duelos.firebasestorage.app");


// Nueva función para crear un módulo completo (con o sin imagen)
exports.createModule = onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "Usuario no autenticado.");
  }
  if (context.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Se requiere admin.");
  }

  const db = getFirestore();
  const nuevoModulo = {
    nombre: data.nombre,
    descripcion: data.descripcion,
    orden: data.orden,
    color: data.color,
    imageUrl: data.imageUrl || null,
    createdAt: FieldValue.serverTimestamp(),
    criterioMastery: data.criterioMastery,
  };
  const modulosRef = collection(db, "cursos", data.cursoId, "modulos");
  await addDoc(modulosRef, nuevoModulo);
  return {message: "Módulo creado con éxito"};
});

// Endpoint de debug con CORS
exports.debugAuth = onRequest(async (req, res) => {
  // Responder preflight
  if (req.method === "OPTIONS") {
    res
        .set("Access-Control-Allow-Origin", "https://kluppy-duelos.web.app")
        .set("Access-Control-Allow-Methods", "POST, OPTIONS")
        .set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        .status(204)
        .send("");
    return;
  }

  // Aplicar CORS
  await new Promise((resolve) => cors(req, res, resolve));

  const authHeader = req.get("Authorization");
  console.log(">> AUTH HEADER:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(400).json({error: "Falta Authorization: Bearer <token>"});
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("✅ Token verificado:", decoded);
    return res.json({status: "OK", uid: decoded.uid, email: decoded.email});
  } catch (err) {
    console.error("❌ Error al verificar token:", err);
    return res.status(401).json({error: err.toString()});
  }
});

// Callable para testAuth
exports.testAuth = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Usuario no autenticado.");
  }
  return {
    status: "¡Éxito! La autenticación funciona.",
    email: auth.token.email,
  };
});

// Callable para setAdminClaim
exports.setAdminClaim = onCall(async (request) => {
  const auth = request.auth;
  const data = request.data;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Usuario no autenticado.");
  }
  // CORRECCIÓN: Nos aseguramos de que el que llama es admin
  if (auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Se requiere ser administrador.");
  }
  const email = data.email;
  if (typeof email !== "string" || !email.trim()) {
    throw new HttpsError("invalid-argument", "El email debe ser un string no vacío.");
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, {admin: true});
    return {message: `¡Éxito! El usuario ${email} ahora es administrador.`};
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      throw new HttpsError("not-found", `No se encontró ningún usuario con el email: ${email}`);
    }
    console.error(err);
    throw new HttpsError("internal", "Error interno al procesar la solicitud.");
  }
});

// Middleware para verificar la autenticación y que sea admin
const requireAdminAuth = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({error: "No autenticado."});
  }
  const idToken = authHeader.split("Bearer ")[1];

  admin.auth().verifyIdToken(idToken)
      .then((decodedToken) => {
        if (decodedToken.admin !== true) {
          return res.status(403).json({error: "Permiso denegado. Se requiere ser administrador."});
        }
        req.user = decodedToken; // Adjuntamos el usuario a la petición
        next();
      })
      .catch((err) => {
        console.error("Error al verificar token:", err);
        return res.status(403).json({error: "Token inválido o expirado."});
      });
};
// =================================================================
// =====> NUEVA FUNCIÓN PARA SUBIR IMÁGENES <=====
// ================================================================
exports.uploadModuleImage = onRequest({cors: true}, (req, res) => {
  requireAdminAuth(req, res, () => {
    if (req.method !== "POST") {
      return res.status(405).send("Método no permitido");
    }

    const bb = busboy({headers: req.headers});
    const tmpdir = os.tmpdir();
    const uploads = {};
    const fileWrites = [];

    bb.on("file", (fieldname, file, info) => {
      const {filename, mimeType} = info;
      const filepath = path.join(tmpdir, filename);
      uploads[fieldname] = {filepath, mimeType};

      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);

      const promise = new Promise((resolve, reject) => {
        file.on("end", () => writeStream.end());
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
      fileWrites.push(promise);
    });

    bb.on("finish", async () => {
      await Promise.all(fileWrites);

      try {
        const {filepath, mimeType} = Object.values(uploads)[0];
        const destination = `module-images/${Date.now()}_${path.basename(filepath)}`;

        const [uploadedFile] = await bucket.upload(filepath, {
          destination,
          metadata: {contentType: mimeType, cacheControl: "public, max-age=31536000"},
        });

        fs.unlinkSync(filepath); // Limpiamos el fichero temporal
        await uploadedFile.makePublic();

        return res.status(200).json({imageUrl: uploadedFile.publicUrl()});
      } catch (error) {
        console.error("Error al subir imagen a Storage:", error);
        return res.status(500).json({error: "No se pudo subir la imagen."});
      }
    });

    bb.end(req.rawBody);
  });
});

// Webhook de Stripe con CORS
exports.stripeWebhook = onRequest(async (req, res) => {
  // Responder preflight
  if (req.method === "OPTIONS") {
    res
        .set("Access-Control-Allow-Origin", "https://kluppy-duelos.web.app")
        .set("Access-Control-Allow-Methods", "POST, OPTIONS")
        .set("Access-Control-Allow-Headers", "Content-Type, Stripe-Signature")
        .status(204)
        .send("");
    return;
  }

  // Aplicar CORS
  await new Promise((resolve) => cors(req, res, resolve));

  // Inicializar Stripe usando el secreto
  const stripeClient = require("stripe")(stripeSecret.value());
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
  } catch (err) {
    console.error("⚠️ Error en webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const dataObject = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const userId = dataObject.client_reference_id;
      await db.collection("users").doc(userId).update({
        stripeCustomerId: dataObject.customer,
        subscriptionId: dataObject.subscription,
        subscriptionStatus: "active",
      });
      break;
    }
    case "customer.subscription.updated": {
      const subscription = dataObject;
      const usersQuery = await db.collection("users").where("stripeCustomerId", "==", subscription.customer).get();
      if (!usersQuery.empty) {
        const userId = usersQuery.docs[0].id;
        await db.collection("users").doc(userId).update({
          subscriptionStatus: subscription.status,
          subscriptionEndDate: subscription.current_period_end,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = dataObject;
      const usersQuery = await db.collection("users").where("stripeCustomerId", "==", subscription.customer).get();
      if (!usersQuery.empty) {
        const userId = usersQuery.docs[0].id;
        await db.collection("users").doc(userId).update({subscriptionStatus: "canceled"});
      }
      break;
    }
    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  return res.status(200).send();
});
