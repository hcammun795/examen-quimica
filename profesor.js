const supabaseUrl = 'TU_URL_AQUÍ';
const supabaseKey = 'TU_ANON_KEY_AQUÍ';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function cargarEstadisticas() {
    const container = document.getElementById('stats-container');
    
    // Consultamos las estadísticas incluyendo el nombre del tipo de compuesto
    // Nota: Para ver correos electrónicos, el profesor debe tener permisos en auth o usar una tabla de 'perfiles'
    const { data, error } = await _supabase
        .from('estadisticas')
        .select(`
            intentos,
            aciertos,
            user_id,
            tipos_compuestos ( nombre )
        `);

    if (error) {
        container.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = "<p>Aún no hay intentos registrados por ningún alumno.</p>";
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>ID Alumno</th>
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
        let badgeClass = "badge-low";
        if (porcentaje >= 50) badgeClass = "badge-mid";
        if (porcentaje >= 80) badgeClass = "badge-high";

        html += `
            <tr>
                <td><small>${reg.user_id.substring(0,8)}...</small></td>
                <td>${reg.tipos_compuestos.nombre}</td>
                <td>${reg.intentos}</td>
                <td>${reg.aciertos}</td>
                <td><span class="badge ${badgeClass}">${porcentaje}%</span></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// Cargar al iniciar
window.onload = cargarEstadisticas;
