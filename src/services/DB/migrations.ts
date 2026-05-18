import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 30,
      steps: [
        addColumns({
          table: 'plantillas_precios',
          columns: [
            { name: 'estado', type: 'boolean' }
          ]
        })
      ]
    }
  ]
});
