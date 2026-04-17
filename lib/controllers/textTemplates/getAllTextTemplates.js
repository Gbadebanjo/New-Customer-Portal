import TextTemplate from '@/database/models/TextTemplate';

export const dynamic = "force dynamic";

export default async function getAllTextTemplates(){
    const textTemplates = await TextTemplate.findAll({ raw: true })
    return {textTemplates};
}
