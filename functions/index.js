// --- Importaciones ---
const {VertexAI} = require("@google-cloud/vertexai");
const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");
const {getFirestore, FieldValue} = require("firebase-admin/firestore"); // Importación limpia

const cors = require("cors")({origin: true});
const busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Secretos gestionados por Firebase
const stripeSecret = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

// Inicializar Admin SDK
admin.initializeApp();
const db = getFirestore();
const bucket = admin.storage().bucket();

// Nueva función para crear un módulo completo (con o sin imagen)
// =================================================================
// =====> FUNCIÓN 'createModule' CORREGIDA <=====
// =================================================================
exports.createModule = onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "Usuario no autenticado.");
  }
  if (context.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Se requiere admin.");
  }

  // No es necesario volver a llamar a getFirestore() aquí.
  const nuevoModulo = {
    nombre: data.nombre,
    descripcion: data.descripcion,
    orden: data.orden,
    color: data.color,
    imageUrl: data.imageUrl || null,
    createdAt: FieldValue.serverTimestamp(),
    criterioMastery: data.criterioMastery,
  };

  // --- CORRECCIÓN DE SINTAXIS ---
  // Así se crea una referencia a una subcolección con el SDK de Admin.
  const modulosRef = db.collection("cursos").doc(data.cursoId).collection("modulos");

  // --- CORRECCIÓN DE SINTAXIS ---
  // Así se añade un nuevo documento con el SDK de Admin.
  const docRef = await modulosRef.add(nuevoModulo);

  return {
    message: "Módulo creado con éxito",
    moduleId: docRef.id, // Devolvemos el ID del nuevo módulo
  };
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

// Añade esta función al final de tu archivo index.js
exports.verificarAdmin = onCall((data, context) => {
  // Esta función solo comprueba la autenticación y el claim de admin.
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "TEST: El contexto de autenticación está vacío.");
  }
  if (!context.auth.token.admin) {
    throw new HttpsError("permission-denied", "TEST: El token no tiene el claim de admin.");
  }

  // Si todo va bien, devuelve un mensaje de éxito.
  console.log(`Llamada de prueba exitosa por: ${context.auth.token.email}`);
  return {status: "OK", message: `Hola admin ${context.auth.token.name}, tus permisos funcionan!`};
});

/**
 * Actualiza el perfil de ritmo de un usuario con las estadísticas de su última sesión.
 * Es una función "callable" (v2), lo que significa que la podemos llamar directamente desde nuestro JavaScript.
 */
exports.updateTypingProfile = onCall({region: "us-central1"}, async (request) => {
  // 1. Verificación de autenticación
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "La función solo puede ser llamada por usuarios autenticados.");
  }

  // 2. Validación de los datos recibidos
  const {sessionIKIs} = request.data;
  if (!Array.isArray(sessionIKIs) || sessionIKIs.length < 10) {
    return {status: "success", message: "Sesión demasiado corta, no se actualiza el perfil."};
  }

  const uid = request.auth.uid;
  // Usamos la instancia 'db' que ya inicializamos arriba.
  const profileRef = db.collection("users").doc(uid).collection("stats").doc("typingProfile");

  try {
    const doc = await profileRef.get();

    const sessionKeystrokes = sessionIKIs.length;
    const sessionAverageIKI = sessionIKIs.reduce((a, b) => a + b, 0) / sessionKeystrokes;

    const calculateStdDev = (arr, mean) => {
      if (arr.length < 2) return 0;
      const variance = arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length;
      return Math.sqrt(variance);
    };
    const sessionStdDevIKI = calculateStdDev(sessionIKIs, sessionAverageIKI);

    if (!doc.exists) {
      console.log(`Creando perfil de ritmo para el usuario ${uid}`);
      await profileRef.set({
        averageIKI: sessionAverageIKI,
        stdDevIKI: sessionStdDevIKI,
        totalKeystrokes: sessionKeystrokes,
        lastUpdated: FieldValue.serverTimestamp(), // Usamos FieldValue importado arriba
      });
    } else {
      const oldProfile = doc.data();
      const oldWeight = 0.95;
      const newWeight = 0.05;

      const newAverageIKI = (oldProfile.averageIKI * oldWeight) + (sessionAverageIKI * newWeight);
      const newStdDevIKI = (oldProfile.stdDevIKI * oldWeight) + (sessionStdDevIKI * newWeight);
      const newTotalKeystrokes = oldProfile.totalKeystrokes + sessionKeystrokes;

      console.log(`Actualizando perfil de ritmo para el usuario ${uid}`);
      await profileRef.update({
        averageIKI: newAverageIKI,
        stdDevIKI: newStdDevIKI,
        totalKeystrokes: newTotalKeystrokes,
        lastUpdated: FieldValue.serverTimestamp(),
      });
    }

    return {status: "success", message: "Perfil actualizado correctamente."};
  } catch (error) {
    console.error("Error al actualizar el perfil de ritmo:", error);
    throw new HttpsError("internal", "No se pudo actualizar el perfil de ritmo.");
  }
});

// AÑADE ESTA NUEVA FUNCIÓN AL FINAL DE index.js

/**
 * Genera un texto para un ejercicio de mecanografía usando la IA de Gemini.
 */
exports.generateExerciseText = onCall({region: "us-central1"}, async (request) => {
  // 1. Verificación de autenticación
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para generar textos.");
  }

  // 2. Validación de los datos recibidos
  const config = request.data.config;
  const resultadosPrevios = request.data.resultadosPrevios || [];

  if (!config || !config.prompt) {
    throw new HttpsError("invalid-argument", "Falta la configuración o el prompt para la IA.");
  }

  const {prompt, characterSet, longitudGenerada} = config;

  // 3. Inicialización del cliente de IA
  const vertexAI = new VertexAI({project: process.env.GCLOUD_PROJECT, location: "us-central1"});
  const generativeModel = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite-001",
  });

  // 4. Construcción del prompt detallado para la IA
  const historial = resultadosPrevios.map(r => `PPM ${r.ppm} con ${r.precision}%`).join('; ');

  const fullPrompt = `
      Eres un experto en crear ejercicios de mecanografía para hispanohablantes.
      Tu única tarea es generar un texto en español para practicar.

      REGLAS ESTRICTAS E INQUEBRANTABLES:
      1. El texto generado debe contener ÚNICA Y EXCLUSIVAMENTE los siguientes caracteres, sin excepción: '${characterSet ? characterSet.join("") : "abcdefghijklmnñopqrstuvwxyz "}'. No puedes usar ningún otro carácter, letra, número o signo de puntuación que no esté en esta lista.
      2. El texto debe tener una longitud aproximada de ${longitudGenerada || 150} caracteres.
      3. El texto debe ser un único párrafo continuo, sin saltos de línea.
      4. No incluyas comillas ni al principio ni al final del texto generado.

      ${historial ? `Resultados previos: ${historial}.` : ''}
      INSTRUCCIÓN GUÍA (úsala como inspiración para el tema, pero siempre respetando las reglas anteriores): "${prompt}"
  `;

  try {
    // 5. Llamada a la API de Gemini
    console.log("Enviando prompt a Gemini...");
    const resp = await generativeModel.generateContent(fullPrompt);

    // 6. Validación robusta de la respuesta
    if (
      !resp.response ||
      !resp.response.candidates ||
      resp.response.candidates.length === 0 ||
      !resp.response.candidates[0].content ||
      !resp.response.candidates[0].content.parts ||
      resp.response.candidates[0].content.parts.length === 0
    ) {
      console.error("Respuesta inválida o vacía de Gemini:", JSON.stringify(resp.response));
      throw new HttpsError("internal", "La IA no pudo generar una respuesta válida.");
    }

    const content = resp.response.candidates[0].content.parts[0].text;
    console.log("Respuesta recibida de Gemini:", content);
    return {exerciseText: content.trim()};
  } catch (err) {
    console.error("Error detallado en el servidor:", err);
    if (err instanceof HttpsError) {
      throw err;
    } else {
      throw new HttpsError("internal", `Error del servidor: ${err.message}`);
    }
  }
});
