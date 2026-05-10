const supabaseUrl = 'https://uiletyxxsmsxwjvnfziu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbGV0eXh4c21zeHdqdm5meml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTM1NzUsImV4cCI6MjA5Mzg4OTU3NX0.d-QGKtt6IQxwfKRw7rEhFF3VGF_x9xIgf_2k4jkSIAk';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function cargarEstadisticas() {
    const container = document.getElementById('stats-container');
    container.innerHTML = "Consultando base de datos...";

    // Traemos las estadísticas y los nombres de los temas
    const { data, error } = await _supabase
        .from('estadisticas')
        .select(`
            intentos,
            aciertos,
            user_id,
            tipo_id,
            tipos_compuestos ( nombre )
        `);

    if (error) {
        console.error("Error en consulta:", error);
        container.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No hay datos guardados aún.</p>";
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Alumno (ID)</th>
                    <th>Tema</th>
                    <th>Intentos</th>
                    <th>Aciertos</th>
                    <th>Éxito (%)</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(reg => {
        const porcentaje = reg.intentos > 0 ? Math.round((reg.aciertos / reg.intentos) * 100) : 0;
        
        // Manejo de errores si la relación falla
        const nombreTema = reg.tipos_compuestos ? reg.tipos_compuestos.nombre : `ID Tema: ${reg.tipo_id}`;
        
        let badgeClass = "badge-low";
        if (porcentaje >= 50) badgeClass = "badge-mid";
        if (porcentaje >= 80) badgeClass = "badge-high";

        html += `
            <tr>
                <td><small>${reg.user_id.substring(0,8)}...</small></td>
                <td>${nombreTema}</td>
                <td>${reg.intentos}</td>
                <td>${reg.aciertos}</td>
                <td><span class="badge ${badgeClass}">${porcentaje}%</span></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

window.onload = cargarEstadisticas;
