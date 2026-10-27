import sys
import zipfile
import xml.etree.ElementTree as ET

def read_docx(file_path):
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            # The namespaces in docx
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Find all text elements
            texts = tree.findall('.//w:t', namespaces)
            
            return ' '.join([t.text for t in texts if t.text])
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        print(f"--- {arg} ---")
        print(read_docx(arg))
        print("\n")
