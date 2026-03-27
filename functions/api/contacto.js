export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { nombre, empresa, email, telefono, servicio, mensaje } = body;

        // Inserción en la base de datos (env.DB)
        const stmt = env.DB.prepare(
            `INSERT INTO leads_comerciales (nombre, empresa, email, telefono, servicio, mensaje) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(nombre, empresa, email, telefono, servicio, mensaje);

        await stmt.run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Error al guardar" }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}